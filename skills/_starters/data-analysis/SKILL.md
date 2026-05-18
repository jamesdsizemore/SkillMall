---
name: data-analysis
description: "Run reproducible data analysis using tidy data principles (Wickham 2014): clean first, explore second, model third, communicate last."
license: MIT
metadata:
  version: "1.0.0"
  author: "[FILL-IN: github-username]"
  category: research
  tags: "data, analysis, statistics, pandas, tidyverse"
---

# Tidy Data Analysis Workflow

Structured data analysis grounded in Hadley Wickham's tidy data principles (2014). The workflow runs in one direction: question → data → clean → explore → model → communicate. Skipping steps produces unreliable results and unreproducible work.

## When to Use

- Starting any structured data analysis project
- Auditing an existing analysis for reproducibility and data quality problems
- Onboarding a new dataset into a team's analysis pipeline
- Do NOT use when: the question is undefined — analysis without a question produces answers to questions nobody asked

## Data Sources and Tools

**Data source:** [FILL-IN: data-source]
**Analysis tool:** [FILL-IN: analysis-tool]

Configure your environment before any analysis begins. If the data source requires credentials, store them in environment variables — never hardcode credentials in notebooks or scripts.

## Tidy Data Principles

A dataset is tidy when it satisfies three rules (Wickham 2014):

1. **Each variable is a column.** One column = one variable. If column headers are values (e.g., "Jan", "Feb", "Mar" as column names for a date variable), the data is not tidy.
2. **Each observation is a row.** One row = one observation at one point in time or one unit of analysis. Multiple observations per row indicates a pivoted or denormalized structure.
3. **Each type of observational unit is a table.** Orders and customers are different observational units and belong in separate tables, joined when needed.

## Common Messy Data Problems

**Problem: Column headers are values**
Symptom: Wide format data where each column represents a category value, not a variable name.
Fix: Pivot (melt) from wide to long format. In pandas: `pd.melt()`. In R/tidyr: `pivot_longer()`.

**Problem: Multiple variables in one column**
Symptom: A single column contains two pieces of information, e.g. "2024-Q1" or "age_gender".
Fix: Split the column. In pandas: `str.split()` + `expand=True`. In R: `tidyr::separate()`.

**Problem: Variables stored as rows**
Symptom: A "variable" column and a "value" column, where variable names are row values.
Fix: Pivot wide. In pandas: `pivot()` or `pivot_table()`. In R: `pivot_wider()`.

**Problem: Computed values mixed with raw data**
Symptom: A "Total" row at the bottom of a table, or a "% of total" column stored alongside raw counts.
Fix: Remove computed values from raw data storage. Compute them at analysis time, not storage time. Storing computed values causes double-counting errors when data is joined or aggregated.

## Analysis Workflow

### Step 1 — Define the Question

Write the analysis question as a single sentence before touching data. The question must be specific enough that you could answer "yes, this analysis answered it" or "no, it didn't."

Good: "Did users who received the onboarding email sequence retain at a higher 30-day rate than those who did not?"
Bad: "How is user retention?"

### Step 2 — Data Ingestion

Connect to [FILL-IN: data-source] and load the dataset. Record:
- Row count and column count of the raw dataset
- Date range of the data
- Any filters applied at ingestion time (document these — undocumented filters are analysis errors waiting to happen)

### Step 3 — Data Cleaning

Run the tidy data checklist before any analysis:

- [ ] Each variable is in its own column (no value-as-header patterns)
- [ ] Each observation is in its own row (no pivoted structures)
- [ ] Each observational unit has its own table
- [ ] No computed values stored with raw data (no subtotals, percentages, or derived columns mixed in)
- [ ] Missing values are identified and a handling strategy is documented (impute, exclude, or flag — not silently dropped)
- [ ] Outliers are identified and a handling strategy is documented (investigate before excluding)
- [ ] Data types are correct (dates as dates, not strings; categoricals encoded correctly)

Document every cleaning step. Undocumented cleaning is an analysis error.

### Step 4 — Exploratory Data Analysis (EDA)

Before any modeling or hypothesis testing, explore the data:

**Distributions:** Plot each key variable's distribution. Look for bimodal distributions, unexpected skew, and values that cluster at zero or at maximums (ceiling/floor effects).

**Missing values:** Visualize the missing data pattern. Missing values rarely occur at random — their pattern often contains signal.

**Outliers:** Apply the 1.5 IQR rule as a starting point. Investigate outliers before excluding them. An outlier is sometimes the most important observation in the dataset.

**Relationships:** Plot the relationship between the key variables from your question. A scatterplot and correlation matrix before any modeling prevents modeling the wrong relationship.

EDA is generative, not confirmatory. If EDA reveals something unexpected about the data structure, return to Step 3.

### Step 5 — Model

Choose the simplest model that can answer the question. Complexity is a cost, not a virtue.

**Set a random seed** before any operation with stochastic behavior. Analysis must be reproducible — the same code run on the same data must produce the same result.

**Split if predicting** — if the analysis is predictive, hold out a test set before any model fitting. Never fit on test data.

**Report uncertainty** — every estimate needs a confidence interval or standard error. A point estimate without uncertainty is not an analysis result.

### Step 6 — Communicate

Structure the output for decision-making:

1. **Finding first** — state the answer to the question in the first sentence. Do not bury the lede.
2. **Evidence second** — show the data and model output that supports the finding.
3. **Method last** — describe how you got there, briefly. Decision-makers need findings; reviewers need methods.
4. **Limitations** — state what this analysis cannot answer and what assumptions it rests on.

**The threshold:** "Good enough to make a decision" is the stopping criterion, not "statistically perfect." If the analysis provides enough evidence to act with appropriate confidence, it is complete.

## Reproducibility Requirements

- [ ] Analysis script or notebook runs top-to-bottom without errors in a clean environment
- [ ] All package versions pinned in requirements file or renv.lock
- [ ] Random seed set before any stochastic operation
- [ ] Data source connection is parameterized (no hardcoded paths or credentials)
- [ ] Output files are versioned or timestamped — do not overwrite results

## Supporting Files

- Template: [resources/templates/analysis-brief.md](resources/templates/analysis-brief.md)
- Template: [resources/templates/tidy-data-checklist.md](resources/templates/tidy-data-checklist.md)
