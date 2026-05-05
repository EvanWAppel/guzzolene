import os
from pathlib import Path

import polars as pl

_HERE = Path(__file__).parent
OIL_CACHE_PATH = _HERE / "oil_prices.csv"


def get_oil_prices(start: str, end: str) -> pl.DataFrame:
    """
    Return daily WTI crude oil closing prices ($/barrel) between start and end.
    Fetches from Yahoo Finance on first call and caches to oil_prices.csv.
    """
    if os.path.exists(OIL_CACHE_PATH):
        cached = pl.read_csv(OIL_CACHE_PATH, try_parse_dates=True)
        # Use cache if it covers the requested range
        if str(cached["date"][0]) <= start and str(cached["date"][-1]) >= end:
            return cached

    import yfinance as yf

    hist = yf.Ticker("CL=F").history(start=start, end=end)
    df = pl.DataFrame({
        "date": [d.date() for d in hist.index],
        "oil_price": hist["Close"].tolist(),
    })
    df.write_csv(OIL_CACHE_PATH)
    return df


def fill_derived_values(df: pl.DataFrame) -> pl.DataFrame:
    """Fill cost, gallons, and price_per_gallon where derivable from the other two."""
    return df.with_columns(
        pl.when(
            pl.col("price_per_gallon").is_null()
            & pl.col("cost").is_not_null()
            & pl.col("gallons").is_not_null()
        )
        .then(pl.col("cost") / pl.col("gallons"))
        .otherwise(pl.col("price_per_gallon"))
        .round(3)
        .alias("price_per_gallon"),

        pl.when(
            pl.col("gallons").is_null()
            & pl.col("cost").is_not_null()
            & pl.col("price_per_gallon").is_not_null()
        )
        .then(pl.col("cost") / pl.col("price_per_gallon"))
        .otherwise(pl.col("gallons"))
        .round(3)
        .alias("gallons"),

        pl.when(
            pl.col("cost").is_null()
            & pl.col("gallons").is_not_null()
            & pl.col("price_per_gallon").is_not_null()
        )
        .then(pl.col("gallons") * pl.col("price_per_gallon"))
        .otherwise(pl.col("cost"))
        .round(2)
        .alias("cost"),
    )


def fill_odometer(df: pl.DataFrame) -> pl.DataFrame:
    """
    Fill odometer nulls in three passes:
      1. Interpolate interior nulls between known readings.
      2. Extrapolate trailing nulls using the dataset's average miles/day.
      3. Backward-fill any remaining leading nulls (before first known reading).
    """
    # Pass 1: interpolate interior nulls
    df = df.with_columns(pl.col("odometer").interpolate())

    # Pass 2: extrapolate trailing nulls
    known = df.filter(pl.col("odometer").is_not_null())
    if len(known) >= 2 and df["odometer"].null_count() > 0:
        first_odo = known["odometer"][0]
        last_odo = known["odometer"][-1]
        first_date = known["date"][0]
        last_date = known["date"][-1]
        avg_miles_per_day = (last_odo - first_odo) / (last_date - first_date).days

        df = df.with_columns(
            pl.when(
                pl.col("odometer").is_null() & (pl.col("date") > pl.lit(last_date))
            )
            .then(
                last_odo
                + (pl.col("date") - pl.lit(last_date)).dt.total_days() * avg_miles_per_day
            )
            .otherwise(pl.col("odometer"))
            .round(0)
            .alias("odometer")
        )

    # Pass 3: extrapolate leading nulls backwards from first known reading
    if df["odometer"].null_count() > 0:
        first_odo = known["odometer"][0]
        first_date = known["date"][0]

        df = df.with_columns(
            pl.when(
                pl.col("odometer").is_null() & (pl.col("date") < pl.lit(first_date))
            )
            .then(
                first_odo
                - (pl.lit(first_date) - pl.col("date")).dt.total_days() * avg_miles_per_day
            )
            .otherwise(pl.col("odometer"))
            .round(0)
            .alias("odometer")
        )

    return df


def fill_remaining(df: pl.DataFrame) -> pl.DataFrame:
    """Forward-fill then backward-fill cost, gallons, and price_per_gallon."""
    cols = ["cost", "gallons", "price_per_gallon"]
    df = df.with_columns([pl.col(c).forward_fill() for c in cols])
    df = df.with_columns([pl.col(c).backward_fill() for c in cols])
    return df


def fill_nulls(df: pl.DataFrame) -> pl.DataFrame:
    df = fill_derived_values(df)
    df = fill_odometer(df)
    df = fill_remaining(df)
    return df


def monthly_avg(df: pl.DataFrame) -> pl.DataFrame:
    """
    Aggregate the gas purchase DataFrame to monthly averages.
    cost_per_mile is computed per fill-up before grouping so the odometer
    diff is accurate, then averaged within each month.
    """
    with_cpm = df.with_columns([
        pl.col("date").dt.truncate("1mo").alias("month"),
        (pl.col("cost") / pl.col("odometer").diff()).alias("cost_per_mile"),
    ])
    return (
        with_cpm
        .group_by("month")
        .agg([
            pl.col("cost").mean().round(2),
            pl.col("gallons").mean().round(3),
            pl.col("odometer").mean().round(0),
            pl.col("price_per_gallon").mean().round(3),
            pl.col("cost_per_mile")
              .filter((pl.col("cost_per_mile") > 0) & (pl.col("cost_per_mile") < 1.0))
              .mean()
              .round(4),
        ])
        .sort("month")
        .rename({"month": "date"})
    )
