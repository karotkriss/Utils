# Changelog

## [1.7.0] - 2025-04-09

### Added
  - **New Props for `frappe.utilsPlus.hideFields`:**
    - Added `conditional` and `debug` props

## [1.6.0] - 2025-04-07

### Added
  - **`frappe.utilsPlus`:**
    - add Utils to the window object under frappe with namespace `frappe.utilsPlus` to comply with frappe best practice.

## [1.5.0] - 2025-04-07

### Added
  - **`site.getEnvironment()`:**
    - This method is meant to retrieve whether if you are in production or a dev environment (returns "development" or "production").

### Fixed
  - **`dubug` property:**
    - disabled all console logs and warning in production

## [1.4.3] - 2025-04-07

### Fixed
  - fixed duplicated tab navigation element on refresh

## [1.4.2] - 2025-03-21

### Added
  - Added support for an optional `state` parameter to `workflow.getFutureTransitions()`, allowing developers to pass a custom starting state instead of relying solely on the current document's workflow state.

## [1.4.1] - 2025-03-20

### Fixed
- **`workflow.getFutureTransition()`: Infinite Resursion**
  - Refactored `workflow.getFutureTransitions()` to utilize a transition map approach, eliminating redundant state evaluations and improving efficiency.
  - Introduced a structured transition map that ensures only unique state transitions are collected, preventing excessive recursive calls.

## [1.4.0] - 2025-03-20

### Added
- **Workflow Management**
  - Introduced `workflow.getActions()` to retrieve allowed workflow actions.
  - Added `workflow.getTransitions()` to list workflow transitions from the current state.
  - Implemented `workflow.getAllTransitions()` to fetch all transitions for a DocType.
  - New `workflow.getFutureTransitions()` to list all possible future transitions.

- **Deprecated Methods**
  - `getActions()`, `getWorkflowTransitions()`, and `getAllWorkflowTransitions()` are now deprecated in favor of `workflow.getActions()`, `workflow.getTransitions()`, and `workflow.getAllTransitions()`.
  - These deprecated methods will be removed in version 2.0.0.

### Changed
- **Refactored Workflow API**
  - All workflow-related functions are now encapsulated under the `workflow` object.
  - `getFutureWorkflowTransitions()` is now `workflow.getFutureTransitions()`.
  - Updated all JSDoc comments to reflect the new API structure.

- **Improved Documentation**
  - Examples in JSDoc have been updated to use ES6 syntax.
  - Added comments explaining each example.

### Fixed
- **Consistency Fixes**
  - Adjusted API function names for better readability and consistency.
  - Deprecated methods now display a warning message when called.

## [1.3.0] - 2025-03-19

### Added
- **Form Navigation**
  - New `className` prop: Allows for additional classes to be specified for the tab buttons.

## [1.2.0] - 2025-03-18

### Fixed
- **Form Navigation**
  - Variants prop adjusted to take lowercase variant names instead of title case: `primary: "btn-primary"`, `secondary: "btn-secondary"`, `destructive: "btn-danger"`, `outline: "btn-outline"`, `ghost: "btn-ghost"`.

## [1.1.1] - 2025-03-17

### Added
- **Workflow Management Enhancements**
    - Introduced `getActions()` to retrieve allowed workflow actions.
    - Added `getWorkflowTransitions()` to list workflow transitions from the current state.
    - Implemented `getAllWorkflowTransitions()` to fetch all transitions for a DocType.
    - New `action.confirm()` function to intercept workflow actions with confirmation prompts.

- **Form Navigation & Structure**
    - `getTabs()`, `getFieldsInTab()`, `getFieldsInSection()`, and `getFieldsInColumn()` now accept configuration objects instead of multiple parameters.
    - Added `hasNextTab()` and `hasPreviousTab()` to check navigation availability.

- **Site Information**
    - New `site.apps()` function to retrieve installed applications and their versions.

### Changed
- **Refactored API Calls:**
    - `getTabs()` now uses an object parameter `{ excludeHidden: false }` instead of a boolean argument.
    - `getFieldsInTab()`, `getFieldsInSection()`, and `getFieldsInColumn()` follow a similar refactored API structure.

- **Improved Functionality**
    - `makeReadOnly()` now includes:
        - permissions: Allows bypassing read-only restrictions for users with specified roles.
        - preserveReadonly: Prevents overwriting fields that are already read-only.
    - `checkMandatory()` now ensures dirty state updates when required fields are marked.

### Fixed
- **Dependency Checks**
    - `getTabs()` and related functions now correctly evaluate `depends_on` expressions.
    - `goToTab()` prevents scrolling if no valid fields exist in the target tab.

- **Navigation Issues**
    - `goToTab.next()` and `goToTab.previous()` now correctly detect hidden tabs.

## [0.1.0] - Initial Version
- Basic utility functions for Frappe form navigation and field management.

