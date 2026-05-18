# Tidy Data Validation Checklist

**Dataset:** [Name or description]
**Source:** [FILL-IN: data-source]
**Validated by:** [Name]
**Date:** [Date]
**Tool:** [FILL-IN: analysis-tool]

Run this checklist before any EDA or modeling. If any check fails, fix the data before proceeding. Document every fix.

---

## Rule 1: Each Variable Is a Column

- [ ] No column headers are data values (e.g., no "Jan", "Feb", "Mar" as column names representing a month variable)
- [ ] No column represents a combination of two variables (e.g., no "age_gender" column that encodes two separate things)
- [ ] Each column has one and only one variable

**Violations found:**

| Column name | Problem | Fix applied |
|-------------|---------|-------------|
| [column] | [description of violation] | [what was done to fix it] |

---

## Rule 2: Each Observation Is a Row

- [ ] Each row represents exactly one observation (one event, one user, one transaction — whatever the unit of analysis is)
- [ ] No pivoted or wide-format structures where multiple observations share a row
- [ ] No summary or subtotal rows mixed in with raw data (e.g., no "Total" row at the bottom)

**Violations found:**

| Row range or pattern | Problem | Fix applied |
|----------------------|---------|-------------|
| [description] | [violation] | [fix] |

---

## Rule 3: Each Observational Unit Is a Table

- [ ] All rows in this table represent the same type of thing (e.g., all rows are users, or all rows are orders — not a mix)
- [ ] If this dataset joins two different observational units, they are stored in separate tables and joined at query time, not merged at storage time

**Units in this table:**
[ ] Confirmed: all rows represent [unit type]
[ ] Problem: rows represent [unit type A] and [unit type B] — needs to be split

---

## Rule 4: No Computed Values Mixed With Raw Data

- [ ] No percentage or ratio columns stored alongside the raw counts that compute them
- [ ] No running totals or cumulative sum columns stored as data
- [ ] No "last updated" timestamps that overwrite rather than append

**Violations found:**

| Column | Problem | Fix applied |
|--------|---------|-------------|
| [column] | [computed value stored as raw] | [removed / moved to derived table] |

---

## Missing Values

- [ ] Missing values are identified and counted per column
- [ ] Missing value handling strategy is documented: impute / exclude / flag — not silently dropped

**Missing value inventory:**

| Column | Count missing | % of rows | Handling strategy |
|--------|--------------|-----------|-------------------|
| [column] | [#] | [%] | [impute with X / exclude rows / flag as unknown] |

---

## Outlier Inventory

- [ ] Outliers identified using 1.5 IQR rule for numeric columns
- [ ] Each outlier investigated before deciding to include or exclude
- [ ] Exclusion decisions documented with rationale

**Outlier log:**

| Column | Outlier value(s) | Count | Investigation notes | Decision |
|--------|-----------------|-------|--------------------| ---------|
| [column] | [value] | [#] | [what we found] | Include / Exclude |

---

## Data Types

- [ ] Date and datetime columns are stored as date types, not strings
- [ ] Categorical variables are encoded correctly (not as raw integers with no mapping)
- [ ] Numeric columns are the correct numeric type (integer vs. float)
- [ ] IDs and codes that should not be summed are strings, not integers

**Type corrections made:**

| Column | Original type | Corrected type | Reason |
|--------|--------------|----------------|--------|
| [column] | [string] | [date] | [dates were stored as ISO strings] |

---

## Cleaning Log

Document every transformation applied to the raw data. Undocumented cleaning is an analysis error.

| Step | Description | Code reference | Rows affected |
|------|-------------|----------------|---------------|
| 1 | [what was done] | [file:line or function name] | [#] |
| 2 | [what was done] | [file:line or function name] | [#] |

**Raw row count:** [#]
**Clean row count:** [#]
**Rows removed:** [#] — reasons: [list reasons]

---

## Sign-Off

- [ ] Checklist complete — all rules verified
- [ ] All violations documented and fixed or deferred with rationale
- [ ] Cleaning log complete
- [ ] Cleaned dataset saved to: [path or table name]

*Validated by: [Name] on [Date]*
