from datetime import date

import matplotlib.pyplot as plt
import polars as pl
from utils import fill_nulls, get_oil_prices, monthly_avg

DATA_PATH = "gas_purchases.csv"

_PLOT_CONFIGS = {
    "cost":             {"label": "Total Cost ($)",       "color": "#2196F3"},
    "gallons":          {"label": "Gallons Pumped",       "color": "#4CAF50"},
    "odometer":         {"label": "Odometer (mi)",        "color": "#FF9800"},
    "price_per_gallon": {"label": "Price per Gallon ($)", "color": "#E91E63"},
}

# Significant events affecting fuel markets.
# Label y-positions stagger at 4 levels to prevent overlap for nearby events.
EVENTS = [
    (date(2019, 9, 14), "Aramco Drone\nAttack"),
    (date(2020, 3,  9), "COVID-19 Lockdowns\n& Oil Price War"),
    (date(2021, 5,  7), "Colonial Pipeline\nHack"),
    (date(2022, 2, 24), "Russia Invades\nUkraine"),
    (date(2022, 10, 5), "OPEC+ 2M BPD\nCut"),
    (date(2023, 4,  2), "OPEC+ Surprise\nCut"),
    (date(2026, 2, 28), "Operation Epic Fury\n(US Strikes Iran)"),
    (date(2026, 3,  2), "Iran Closes\nStrait of Hormuz"),
]

_LABEL_Y_POSITIONS = [0.97, 0.78, 0.59, 0.40]


def get_data(path: str = DATA_PATH) -> pl.DataFrame:
    df = pl.read_csv(path, try_parse_dates=True)
    return fill_nulls(df)


def _draw_events(ax: plt.Axes) -> None:
    for i, (event_date, label) in enumerate(EVENTS):
        ax.axvline(event_date, color="gray", linewidth=0.8, linestyle="--", alpha=0.55)
        ax.text(
            event_date,
            _LABEL_Y_POSITIONS[i % len(_LABEL_Y_POSITIONS)],
            label,
            transform=ax.get_xaxis_transform(),
            fontsize=6,
            rotation=90,
            va="top",
            ha="right",
            color="#444444",
            alpha=0.85,
        )


def _plot_column(ax: plt.Axes, df: pl.DataFrame, column: str) -> None:
    cfg = _PLOT_CONFIGS[column]
    dates = df["date"].to_list()
    values = df[column].to_list()
    ax.plot(dates, values, color=cfg["color"], linewidth=1.2)
    _draw_events(ax)
    ax.set_title(cfg["label"])
    ax.set_xlabel("Date")
    ax.set_ylabel(cfg["label"])
    ax.tick_params(axis="x", rotation=30)


def _make_fig(ax_fn, *args, **kwargs) -> plt.Figure:
    """Create a figure, run ax_fn to populate it, close it so the inline
    backend won't auto-display it, then return it for Jupyter's repr."""
    fig, ax = plt.subplots()
    ax_fn(ax, *args, **kwargs)
    fig.tight_layout()
    plt.close(fig)
    return fig


def plot_cost(df: pl.DataFrame) -> plt.Figure:
    return _make_fig(lambda ax, df: _plot_column(ax, monthly_avg(df), "cost"), df)


def plot_gallons(df: pl.DataFrame) -> plt.Figure:
    return _make_fig(lambda ax, df: _plot_column(ax, monthly_avg(df), "gallons"), df)


def plot_odometer(df: pl.DataFrame) -> plt.Figure:
    return _make_fig(lambda ax, df: _plot_column(ax, monthly_avg(df), "odometer"), df)


def plot_price_per_gallon(df: pl.DataFrame) -> plt.Figure:
    return _make_fig(lambda ax, df: _plot_column(ax, monthly_avg(df), "price_per_gallon"), df)


def plot_cost_per_mile(df: pl.DataFrame) -> plt.Figure:
    df = monthly_avg(df)
    dates = df["date"].to_list()

    pairs = [
        (d, v) for d, v in zip(dates, df["cost_per_mile"].to_list())
        if v is not None and 0 < v < 1.0
    ]
    plot_dates, plot_values = zip(*pairs) if pairs else ([], [])

    oil = (
        get_oil_prices(str(min(dates)), str(max(dates)))
        .with_columns(pl.col("date").dt.truncate("1mo").alias("month"))
        .group_by("month")
        .agg(pl.col("oil_price").mean().round(2))
        .sort("month")
        .rename({"month": "date"})
    )

    fig, ax = plt.subplots()

    # Left axis — cost per mile
    ax.plot(plot_dates, plot_values, color="#9C27B0", linewidth=1.2, label="Cost/mile")
    _draw_events(ax)
    ax.set_title("Cost per Mile vs. WTI Crude Oil Price")
    ax.set_xlabel("Date")
    ax.set_ylabel("Cost per Mile ($/mi)", color="#9C27B0")
    ax.tick_params(axis="x", rotation=30)
    ax.tick_params(axis="y", labelcolor="#9C27B0")

    # Right axis — WTI crude oil price
    ax2 = ax.twinx()
    ax2.plot(
        oil["date"].to_list(),
        oil["oil_price"].to_list(),
        color="#E65100",
        linewidth=1.0,
        alpha=0.75,
        label="WTI Crude ($/barrel)",
    )
    ax2.set_ylabel("WTI Crude Oil ($/barrel)", color="#E65100")
    ax2.tick_params(axis="y", labelcolor="#E65100")

    # Combined legend
    lines1, labels1 = ax.get_legend_handles_labels()
    lines2, labels2 = ax2.get_legend_handles_labels()
    ax.legend(lines1 + lines2, labels1 + labels2, loc="upper left", fontsize=8)

    fig.tight_layout()
    plt.close(fig)
    return fig


def plot_all(df: pl.DataFrame) -> plt.Figure:
    df = monthly_avg(df)
    fig, axes = plt.subplots(2, 2, figsize=(14, 9))
    for ax, column in zip(axes.flat, _PLOT_CONFIGS):
        _plot_column(ax, df, column)
    fig.suptitle("Gas Purchase History (Monthly Averages)", fontsize=14, fontweight="bold")
    fig.tight_layout()
    plt.close(fig)
    return fig
