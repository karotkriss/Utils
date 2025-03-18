# Changelog

## [1.2.0] - 2025-03-18

### Fixed
- Form Navigation
  - variants prop adjust to take lowercase variant name instead of title case: `primary: "btn-primary"`, `secondary: "btn-secondary"`, `destructive: "btn-danger"`, `outline: "btn-outline"`, `ghost: "btn-ghost"`

## [1.1.1] - 2025-03-17

### Added

- Workflow Management Enhancements
    - Introduced `getActions()` to retrieve allowed workflow actions.
    - Added `getWorkflowTransitions()` to list workflow transitions from the current state.
    - Implemented `getAllWorkflowTransitions()` to fetch all transitions for a DocType.
    - New `action.confirm()` function to intercept workflow actions with confirmation prompts.

- Form Navigation & Structure
    - `getTabs()`, `getFieldsInTab()`, `getFieldsInSection()`, and `getFieldsInColumn()` now accept configuration objects instead of multiple parameters.
    - Added `hasNextTab()` and `hasPreviousTab()` to check navigation availability.

- Site Information
    - New `site.apps()` function to retrieve installed applications and their versions.

### Changed

- Refactored API Calls:
    - `getTabs()` now uses an object parameter `{ excludeHidden: false }` instead of a boolean argument.
    - `getFieldsInTab()`, `getFieldsInSection()`, and `getFieldsInColumn()` follow a similar refactored API structure.

- Improved Functionality
    - `makeReadOnly()` now includes:
        - permissions: Allows bypassing read-only restrictions for users with specified roles.
        - preserveReadonly: Prevents overwriting fields that are already read-only.
    - `checkMandatory()` now ensures dirty state updates when required fields are marked.

### Fixed
- Dependency Checks
    - `getTabs()` and related functions now correctly evaluate `depends_on` expressions.
    - `goToTab()` prevents scrolling if no valid fields exist in the target tab.

- Navigation Issues
    - `goToTab.next()` and `goToTab.previous()` now correctly detect hidden tabs.


## [0.1.0] - Initial Version
- Basic utility functions for Frappe form navigation and field management.