<div align="center" style="padding-bottom: 2rem;">
  <a href="https://github.com/karotkriss/Utils" style="padding bottom: 3rem;">
    <img src="images/icons/utils-icon-black.png" alt="Logo" style="width: 192px; padding: 2rem">
  </a>

  <h1 align="center">Utils JS API for Frappe/ERPNEXT</h1>

  <div align="center">
    Easily interact with frappe's frm object and improve UX with tab Navigations
    <br>
    <br>
    <div style="text-align: justify; text-justify: inter-word;">
		Utils.js is a collection of utility functions for Frappe forms. It simplifies common tasks such as form navigation, field management, and validation by automatically operating on the global `cur_frm`. Whether you’re just starting out or an experienced developer, Utils.js offers a comprehensive API to help you build cleaner and more user-friendly Frappe applications.
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
- [API Reference](#api-reference)
- [Contributing](#contributing)
<!-- - [License](#license) -->

---

## Overview

Utils.js provides a suite of helper functions that simplify working with Frappe forms. It can:
- Retrieve and organize tabs, sections, and columns from the form.
- Check mandatory fields and mark them as required.
- Change workflow states.
- Toggle fields as read-only or hidden based on conditions.
- Assist in navigating between tabs and adding navigation buttons.

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
- **Action Interception:** Intercept workflow actions allowing you to prompt users among other things.

---

## Installation

### Method 1: CDN (Recommended)

Reference the `jsdelivr` in your Frappe app’s `hooks.py` to load it on your pages:

```python
app_include_js = [
    "https://cdn.jsdelivr.net/gh/karotkriss/Utils@master/utils.js",
    # Other JS files can be included here
]
```
### Method 2: Git Subtree ()

#### Adding Utils.js as a Git Subtree

1. **Navigate to Your App’s root:**

	```bash
   	cd path/to/your_apps/root/directory
	```

	This creates a new folder called utils in the public folder that contains the Utils.js module.
2. **Add Utils.js as a Subtree:**

	```bash
	git subtree add --prefix=path/to/public/js/folder/utils https://github.com/karotkriss/Utils.git master --squash
	```


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
const tabsData = Utils.getTabs(true);
console.log("Tabs:", tabsData.tabs);
console.log("Tabs Mapping:", tabsData.json);

```

#### Get Fields in a Tab
```javascript
// Retrieves all fieldnames in a specified tab (e.g., "details_tab")
const fieldsData = Utils.getFieldsInTab("details_tab");
console.log("Fields in tab:", fieldsData.fields);

```

#### Get Fields in a Section
```javascript
// Retrieves all fields in a section with a given fieldname
const sectionData = Utils.getFieldsInSection("contact_section");
console.log("Section fields:", sectionData.fields);

```

#### Get Fields in a Column
```javascript
// Retrieves all fields in a column with a given fieldname
const columnData = Utils.getFieldsInColumn("address_column");
console.log("Column fields:", columnData.fields);

```

### Form Validation

#### Check Mandatory Fields

```javascript
// Check mandatory fields; returns an array of missing fields or true if all are filled.
const missing = Utils.checkMandatory(["first_name", "email"]);
if (missing !== true) {
  console.warn("Missing fields:", missing);
}

```

### Workflow & Read-Only Handling

#### Change Workflow State

```javascript

// Change the workflow state, optionally checking the current state.
Utils.changeWorkflowState("Approved", "Draft");

```

#### Make Fields Read-Only

```javascript
// Set specific fields as read-only, except during certain workflow states.
Utils.makeReadOnly(["first_name", "email"], ["Draft"]);

```

#### Hide Fields

```javascript
// Hide specific fields unless the form is in an exception state.
Utils.hideFields(["internal_note"], ["Draft"]);

```

### Form Navigation

#### Go To Tab
```javascript
// Navigate to a specified tab
Utils.goToTab("details_tab");
```

#### Navigate to Next or Previous Tab
```javascript
// Navigate to the next tab
Utils.goToTab.next();

// Navigate to the previous tab
Utils.goToTab.previous();

```

#### Save and Navigate
```javascript
// Save form and navigate to a specific tab
Utils.goToTab.save("final_tab");

// Save form and go to the next tab
Utils.goToTab.next.save();

// Save form and go to the previous tab
Utils.goToTab.previous.save();

```

### Tab Buttons & Navigation Helpers

#### Add Custom Tab Buttons for Navigation

```javascript
// Add navigation buttons
Util.addTabButtons()

```
#### Saving and navigation
```javascript
// Add navigation buttons that also save your progress in the forms on specified tabs
Utils.addTabButtons({ saveTabs: ['personal_details', 'professional_profile'] });

// Add navigation buttons that also save your progress in the forms on specified tabs
Utils.addTabButtons({ saveTabs: ['*'] });

```

#### Replace the next button with custom buttons

```javascript
// Add navigation buttons to tabs with custom configurations
Utils.addTabButtons({
  buttons: [
    {
      tab: 'final_tab',
      workflowStates: ['Processing Application'],
      label: 'Submit Form',
      variant: 'Secondary',
      conditional: function(cur_frm) { return cur_frm.doc.approved === true; },
      callback: function(frm, tab) {
        console.log('Submit Form button clicked on tab ' + tab);
      }
    },
    {
      tab: 'review_tab',
      workflowStates: ['Draft'],
      label: 'Review & Save',
      variant: 'Destructive',
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
const nextInfo = Utils.hasNextTab();
if (nextInfo.hasNext) {
  console.log("Next tab:", nextInfo.nextTabFieldname);
}

// Determine if there is a previous tab
const prevInfo = Utils.hasPreviousTab();
if (prevInfo.hasPrevious) {
  console.log("Previous tab:", prevInfo.previousTabFieldname);
}

```

### Actions and Action Interception

#### Get Actions

```javascript
// Retrieve available workflow actions (e.g., "Approve", "Reject", "Cancel")
const actionNames = Utils.getActions();
console.log(actionNames);

```

#### Action Availability

```javascript
// check if a specific action is available
Utils.action('action name', {debug: true});

```

#### Action interception

##### Confirm

```javascript
// Attaching a confirmation prompt to the "Approve" action.
const approveAction = Utils.action("Approve", { debug: true });
if (approveAction) {
  approveAction.confirm({
    message: "Are you sure you want to approve this document?",
    onConfirm: (continueAction) => {
      console.log("Approval confirmed.");
      continueAction();
    },
    onCancel: () => {
      console.log("Approval cancelled.");
    },
    debug: true
  });
}
```

#### Warn

```javascript
// Attaching a warning prompt to the "Delete" action using frappe.warn.
const deleteAction = Utils.action("Delete", { debug: true });
if (deleteAction) {
  deleteAction.warn({
    title: "Warning",
    message: "This will permanently delete the document. Continue?",
    onConfirm: (continueAction) => {
      console.log("Deletion warning confirmed.");
      continueAction();
    },
    onCancel: () => {
      console.log("Deletion warning cancelled.");
    },
    debug: true
  });
}

```

#### Throw

```javascript
// Attaching a conditional throw to the "Submit" action.
// If the document is not complete (i.e., conditional returns false), an error is thrown.
const submitAction = Utils.action("Submit", { debug: true });
if (submitAction) {
  submitAction.throw({
    title: "Error",
    message: "Submission is not allowed because the document is incomplete.",
    conditional: (frm) => frm.doc.is_complete === true,
    debug: true
  });
}

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