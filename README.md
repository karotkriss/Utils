<div align="center" style="padding-bottom: 2rem;">
	<a href="https://github.com/karotkriss/Utils" style="padding bottom: 3rem;">
		<img src="images/icons/utils-icon-black.png" alt="Logo" style="width: 192px; padding: 2rem">
	</a>

<h1 align="center">Utils JS API for Frappe/ERPNEXT</h1>

<div align="center">
	Easily interact with frappe's form object, workflows and improve UX with tab Navigations
	<br>
	<br>
	<div style="text-align: justify; text-justify: inter-word;">
	Utils.js is a collection of utility functions for Frappe forms. It simplifies common tasks such as form navigation, field management, workflow management and validation by automatically operating on the global `cur_frm`. Whether you’re just starting out or an experienced developer, Utils.js offers a comprehensive API to help you build cleaner and more user-friendly Frappe applications.
	</div>
</div>
</div>

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
	- [Field Retrieval & Management](#field-retrieval--management)
	- [Form Validation](#form-validation)
	- [Workflow & Read-Only Handling](#workflow--read-only-handling)
	- [Form Navigation](#form-navigation)
	- [Tab Buttons & Navigation Helpers](#tab-buttons--navigation-helpers)
	- [Action Interception](#action-interception)
	- [Workflow and Transition Definitions](#workflow-transition-and-action-retrieval)
	- [Site Information](#site-information)
- [Contributing](#contributing)

---

## Overview

Utils.js provides a suite of helper functions that simplify working with Frappe forms. It can:
- Retrieve and organize tabs, sections, and columns from the form.
- Check mandatory fields and mark them as required.
- Change workflow states.
- Toggle fields as read-only or hidden based on conditions.
- Assist in navigating between tabs and adding navigation buttons.
- Intercept workflow actions allowing you to prompt users among other things.

This module is especially useful in custom Frappe apps, helping you build dynamic and responsive forms with less code.

---

## Features

- **Field Retrieval:** Quickly get an array and mapping of tabs, fields in tabs, sections, or columns.
- **Mandatory Field Checks:** Verify required fields and flag missing entries.
- **Workflow Management:** Change the workflow state and update form values.
- **Read-Only and Hidden Controls:** Set fields as read-only or hide them based on workflow state.
- **Form Navigation:** Scroll to specific tabs or navigate between them with built-in methods.
- **Custom Tab Buttons:** Automatically add navigation buttons (Previous/Next or custom) to each tab pane.
- **Helper Methods:** Determine if there’s a next or previous tab.
- **Action Interception:** Intercept workflow actions allowing you to prompt users.

---

## Installation

### Method 1: CDN (Recommended)

Reference the `jsdelivr` in your Frappe app’s `hooks.py` to load it onto your frappe app:

```python
app_include_js = [
	"https://cdn.jsdelivr.net/gh/karotkriss/Utils@latest/utils.js",
	# Other JS files can be included here
]

```
### Method 2: Git Subtree ()

#### Adding Utils.js as a Git Subtree

1. **Navigate to Your App’s root:**
	```bash
	cd path/to/your_apps/root/directory # replace this with this with the root dir of your frappe app e.g /workspace/development/frappe-bench/apps/lending

	```

	This creates a new folder called utils in the public folder that contains the Utils.js module.
2. **Add Utils.js as a Subtree:**
	```bash
	git subtree add --prefix=path/to/public/js/folder/utils https://github.com/karotkriss/Utils.git master --squash

	```

### Clear Cache

```bash
SITE_NAME=localhost #replace this with the name of your site
bench --site $SITE_NAME clear-cache
bench --site $SITE_NAME clear-website-cache
```

> You should now be able to use any Utils method by calling `frappe.utilsPlus[method]` client side, <br>
> You may also need to clear your browser cache as well. <br>
> Reference to [Usage](#usage) for all a list methods and how to use them.

#### Referencing in hooks.py

Reference the Utils.js file in your Frappe app’s `hooks.py` to load it on your pages:

```python

app_include_js = [
	"/assets/your_app/js/utils/utils.js",
	# Other JS files can be included here
]

```

---

## Usage

Utils.js is intended for use in any client script of your Frappe forms. Below are some detailed examples for various functionalities.

### Field Retrieval & Management

#### Get Tabs

```javascript
// Retrieves tabs from the form (excluding hidden ones if specified)
const { tabs, json } = getTabs({ excludeHidden: true });
console.log("Tabs:", tabs);
console.log("Tab Definitions:", json);

```

#### Get Fields in a Tab
```javascript
// Retrieves all fieldnames in a specified tab (e.g., "details_tab")
const { fields, json } = frappe.utilsPlus.getFieldsInTab({ tab: "details_tab" });
console.log("Fields in tab:", fields);
console.log("Field definitions:", json);

```

#### Get Fields in a Section
```javascript
// Retrieves all fields in a section with a given fieldname
const { fields, json } = frappe.utilsPlus.getFieldsInSection({ section: "contact_section" });
console.log("Section Fields:", fields);
console.log("Field Definitions:", json);

```

#### Get Fields in a Column
```javascript
// Retrieves all fields in a column with a given fieldname
const { fields, json } = frappe.utilsPlus.getFieldsInColumn({ column: "address_column" });
console.log("Column Fields:", fields);
console.log("Field Definitions:", json);

```

### Form Validation

#### Check Mandatory Fields

```javascript
// Check mandatory fields; returns an array of missing fields or true if all are filled.
const missing = checkMandatory({ fields: ["first_name", "last_name"] });
if (missing !== true) {
  console.warn("Missing fields:", missing);
}

```

### Workflow & Read-Only Handling

#### Change Workflow State

```javascript
// Change the workflow state, optionally checking the current state against a specified state.
frappe.utilsPlus.changeWorkflowState({ newState: "Approved", currentStateCheck: "Pending" });

```

#### Make Fields Read-Only

```javascript
// Set fields "first_name" and "last_name" as readonly, but preserve those already readonly.
frappe.utilsPlus.makeReadOnly({
  fields: ["first_name", "last_name"],
  preserveReadonly: true,
  debug: true
});

```

#### Hide Fields

```javascript
// Hide fields "phone" and "email" unless the workflow state is "Draft" and unhide for a specific user with a conditional function
frappe.utilsPlus.hideFields({
  fields: ["phone", "email"],
  exceptionStates: ["Draft"],
  conditional: () => {
    let user = frappe.session.user
    return user !== 'someuse@test.com'
  },
  debug: true
});

```

### Form Navigation

#### Go To Tab
```javascript
// Navigate to the tab with fieldname "details_tab"
frappe.utilsPlus.goToTab({ tab: "details_tab" });
```

#### Navigate to Next or Previous Tab
```javascript
// Navigate to the next tab
frappe.utilsPlus.goToTab.next();

// Navigate to the previous tab
frappe.utilsPlus.goToTab.previous();
```

#### Save and Navigate
```javascript
// Save form and navigate to a specific tab
frappe.utilsPlus.goToTab.save("final_tab");

// Save form and go to the next tab
frappe.utilsPlus.goToTab.next.save();

// Save form and go to the previous tab
frappe.utilsPlus.goToTab.previous.save();

```

### Tab Buttons & Navigation Helpers

#### Add Custom Tab Buttons for Navigation

```javascript
// Add navigation buttons
Utils.addTabButtons()

```
#### Styling Tab Buttons with the `className` prop
``` javascript
// Add bootstrap or Custom classes to you buttons
frappe.utilsPlus.addTabButtons({ className: 'btn btn-info special-tab-button' });


```
#### Saving and navigation
``` javascript
// Add navigation buttons that also save your progress in the forms on specified tabs
frappe.utilsPlus.addTabButtons({ saveTabs: ['personal_details', 'professional_profile'] });

// Add navigation buttons that also save your progress in the forms on specified tabs
frappe.utilsPlus.addTabButtons({ saveTabs: ['*'] });

```

#### Replace the next button with custom buttons
```javascript
// Add navigation buttons to tabs with custom configurations
frappe.utilsPlus.addTabButtons({
  buttons: [
    {
      tab: 'final_tab',
      workflowStates: ['Processing Application'],
      label: 'Submit Form',
      variant: 'secondary',
      conditional: function(cur_frm) { return cur_frm.doc.approved === true; },
      callback: function(frm, tab) {
        console.log('Submit Form button clicked on tab ' + tab);
      }
    },
    {
      tab: 'review_tab',
      workflowStates: ['Draft'],
      label: 'Review & Save',
      variant: 'destructive',
      callback: function(frm, tab) {
        console.log('Review & Save button clicked on tab ' + tab);
      }
    }
  ]
});

```

#### Check for Next/Previous Tabs

```javascript

// Determine if there is a next tab
const { hasNext, nextTab } = hasNextTab();
if (hasNext) {
  console.log("Next tab:", nextTab);
}

// Determine if there is a previous tab
const { hasPrevious, previousTab } = hasPreviousTab();
if (hasPrevious) {
  console.log("Previous tab:", previousTab);
}

```

### Action Interception

#### Confirm

```javascript
// Require the user to confirm they want to perform an action
frappe.utilsPlus.action.confirm({
  action: "Submit"
})

// Intercept "Submit" action with confirmation dialog and update a counter
frappe.utilsPlus.action.confirm({
  action: "Submit",
  message: "Are you sure you want to submit this document?",
  debug: true,
  updateField: {
    field: "revision_count",
    value: cur_frm.doc.revision_count + 1
  }
});

```
### Workflow Transition and Action Retrieval

#### Retrieve all workflow transition
```javascript
frappe.utilsPlus.workflow.getAllTransitions()
```

Log all workflow transitions
```javascript
frappe.utilsPlus.workflow.getAllTransitions().forEach(({ state, next_state, action }) =>
  console.log(`${state} -> ${next_state} via ${action}`)
);

```

Check if any transitions exist
```javascript
const transitions = frappe.utilsPlus.workflow.getAllTransitions();
console.log(transitions.length ? "Transitions available." : "No transitions found.");

```
#### Retrieve Valid Transition for the Current Workflow State

```javascript
frappe.utilsPlus.workflow.getTransitions()
```

Retrieve all transitions from the current state and log them
```javascript
const transitions = frappe.utilsPlus.workflow.getTransitions();
transitions.forEach(({ action, next_state }) => console.log(`${action} -> ${next_state}`));

```

Check if a `Reject` action is available
```javascript
const hasRejectAction = frappe.utilsPlus.workflow.getTransitions().some(({ action }) => action === "Reject");
console.log(hasRejectAction ? "Rejection possible." : "No rejection available.");

```

#### Retrieve all Future Transitions

```javascript
frappe.utilsPlus.workflow.getFutureTransitions();
```

Log all possible future transitions
```javascript
frappe.utilsPlus.workflow.getFutureTransitions().forEach(({ state, next_state, action }) =>
  console.log(`${state} -> ${next_state} via ${action}`)
);

```

Check if "Approved" is a future workflow state
```javascript
const isApprovalPossible = frappe.utilsPlus.workflow.getFutureTransitions().some(({ next_state }) => next_state === "Approved");
console.log(isApprovalPossible ? "Approval is in a future state." : "Approval not possible yet.");

```

#### Action Retrieval
```javascript
frappe.utilsPlus.workflow.getActions()
```

Retrieve all available workflow actions and log them to the console
```javascript
const actions = frappe.utilsPlus.workflow.getActions();
console.log(actions);

```

Check if the "Approve" action is available
```javascript
if (frappe.utilsPlus.workflow.getActions().includes("Approve")) {
  console.log("Approval action available.");
}

```

### Site information

#### Get installed apps and versions
```javascript
frappe.utilsPlus.site.apps()
```
Log the installed apps e.g. [ { name: "ERPNext", version: "v13.0.1" }, ... ]
```javascript
const apps = frappe.utilsPlus.site.apps();
console.log(apps);

```

#### Get Environment
```javascript
frappe.utilsPlus.site.getEnvironment()
```
Logs the current environment ("development" or "production")
```javascript
console.log(`Current Environment: ${frappe.utilsPlus.site.getEnvironment()}`);
```
---

## Contributing

Contributions are welcome! Please follow these guidelines:

- Fork the repository: Create your own branch for your changes.
- Write clear code: Follow the existing coding style and include helpful comments.
- Update the README: Ensure any new features or changes are reflected in the documentation.
- Submit a pull request: Provide a clear summary of your changes.

---

Utils.js is designed to streamline your Frappe form development by simplifying common tasks such as navigation, field management, and validation. With its detailed API and easy integration into your custom Frappe apps, Utils.js is an ideal tool for developers of all levels. Give it a try and see how much simpler your form development can become!
