# Changelog

## [2.4.1] - 2025-08-28

### Fixed
- **Tab Navigation:**
  - ***Active tab detection**: In preparation for version 16 [Frappe Framework](https://github.com/frappe/frappe) has changed the tab links from links to button (`#form-tabs li a` -> `#form-tabs li button`) this broke my active tab detection because I was doing a jquery for `#form-tabs li a.active`. I will decouple the active tab detection from the ui eventually but for now I have hotfixed it `#form-tabs li a.active` -> `#form-tabs li .active`.

## [2.4.0] - 2025-07-27

### Added
- **`action.composeEmail` Action Interceptor:**
  - Introduced a new `action.composeEmail` function to intercept a workflow action and require the user to send an email via the `CommunicationComposer` before the action proceeds.
  - Includes a `setValue` property to update multiple document fields after the user initiates the send action but before the workflow proceeds.

## [2.2.2] - 2025-04-29

### Changed
- **Refactored `getFieldsInTab()`:**
  - Improved code readability and maintainability by removing intermediate state variables (`collectFields`, `tabFound`).
  - Leveraged standard ES6 array methods (`findIndex`, `slice`, `reduce`) for a more declarative and potentially efficient approach.
  - Ensured functional equivalence with the previous implementation, maintaining existing behavior.

## [2.2.1] - 2025-04-14

### Fixed
  - **Tab Content bleeding into each other:**
    - prevent double clicking for tab navigation buttons, clicking in rapid succession caused rendering issues after saving triggers `frappe.dom.freeze()`

## [2.2.0] - 2025-04-12

### Added
  - autoSave after changing workflow state

## [2.1.2] - 2025-04-12

### Fixed
  - workflow state detection for `addTabButtons`

## [2.1.1] - 2025-04-11

### Fixed
  - add missing variant for custom tab buttons: `success`

## [2.1.0] - 2025-04-11

### Added
  - **Disabled Prop for Custom Buttons:**
    Added support for a new property `disable` (boolean) on custom button configuration objects. When set to `true`, the corresponding custom button is rendered with the HTML `disabled` attribute.

  - **Data Attributes for Custom Buttons:**
    Added the `data-label` attribute on custom buttons (populated with the button's label). This facilitates referencing the custom buttons by label in the returned object.

  - **Return Object Structure:**
    Updated the `addTabButtons()` function to return an object where each tab's key maps to a nested object containing jQuery objects for:
      - `previous`: The previous button.
      - `next`: The next button.
      - Custom buttons: Mapped by their label (e.g., `"Submit": jqueryObj`).

  - **Navigation Container Identification:**
    Modified the navigation container markup to include a `data-tab` attribute, which ensures that the proper nav container is selected when retrieving button references.

### Fixed
  - **Custom Buttons Visibility:**
    Resolved an issue where custom buttons were not displayed because the navigation container selector was expecting a `data-tab` attribute that was missing. With the updated markup, the custom buttons now appear as expected.

## [2.0.1] - 2025-04-09

### Added
  - **Duplicate Prevention Mechanism for `frappe.utilsPlus.action.confirm()`:**
    - Added a check using a unique flag (based on the action name) to prevent multiple confirmation dialogs from being triggered for the same workflow action.

## [2.0.0] - 2025-04-09

### Added
  - **Missing `debug` props:**
    - Added missing `debug` props

### Changed
  - **Core `props`:**
    - `sectionFieldName` -> `section`
    - `ColumnFieldName` -> `column`

### Fixed
  - Disabled all logging in production environments.

### Removed
  - `getAllWorkflowTransitions`
	- `getWorkflowTransitions`
	- `getActions`

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

