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
	Utils.js is a collection of utility functions for Frappe forms. It simplifies common tasks such as form navigation, field management, workflow management and validation by automatically operating on the global `cur_frm`. Whether you're just starting out or an experienced developer, Utils.js offers a comprehensive API to help you build cleaner and more user-friendly Frappe applications.
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
	- [Field Change Observers](#field-change-observers)
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

- **Form Structure Retrieval**: Get tabs, sections, columns, and fields programmatically
- **Field Management**: Toggle read-only, hide/show, check mandatory fields
- **Tab Navigation**: Navigate between tabs with save support and callbacks
- **Custom Tab Buttons**: Add Previous/Next/Custom buttons with advanced workflows
- **Workflow Management**: Retrieve actions, transitions, and future states
- **Action Interception**: Confirm, compose emails, or edit fields before workflow actions
- **Field Observers**: Watch field changes with multiple independent listeners
- **Site Information**: Get environment and installed apps
- **Navigation Lifecycle**: beforeNavigation, onNext/onPrev, afterNavigation hooks

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

> You should now be able to use any Utils method by calling `Utils[method]` client side, <br>
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

### Field Retrieval & Management

#### Get Tabs
```javascript
// Get all tabs
const { tabs, json } = Utils.getTabs();
console.log("Tabs:", tabs);

// Exclude hidden tabs
const { tabs } = Utils.getTabs({ excludeHidden: true });
```

#### Get Fields in Tab
```javascript
const { fields, json } = Utils.getFieldsInTab({ 
  tab: "details_tab" 
});
console.log("Fields:", fields);
```

#### Get Fields in Section
```javascript
const { fields, json } = Utils.getFieldsInSection({ 
  section: "personal_info" 
});
```

#### Get Fields in Column
```javascript
const { fields, json } = Utils.getFieldsInColumn({ 
  column: "left_column" 
});
```

### Form Validation

#### Check Mandatory Fields
```javascript
const result = Utils.checkMandatory({ 
  fields: ["first_name", "last_name", "email"] 
});

if (result !== true) {
  console.log("Missing fields:", result);
  frappe.msgprint(`Please fill: ${result.join(', ')}`);
}
```

### Workflow & Read-Only Handling

#### Change Workflow State
```javascript
Utils.changeWorkflowState({
  newState: "Approved",
  currentStateCheck: "Pending Review",
  autoSave: true
});
```

#### Make Fields Read-Only
```javascript
// Make fields read-only except for specific roles
Utils.makeReadOnly({
  fields: ["salary", "bonus"],
  permissions: ["HR Manager", "System Manager"],
  exceptionStates: ["Draft"],
  preserveReadonly: true,
  debug: true
});
```

#### Hide Fields
```javascript
// Hide fields unless in Draft state
Utils.hideFields({
  fields: ["phone", "email"],
  exceptionStates: ["Draft"],
  conditional: () => {
    return frappe.session.user !== 'admin@example.com';
  },
  debug: true
});
```

### Form Navigation

#### Go To Tab
```javascript
// Navigate to a specific tab
Utils.goToTab({ tab: "details_tab" });

// With callback
Utils.goToTab({ 
  tab: "summary_tab",
  callback: ({ frm, currentTab }) => {
    frm.refresh_field('summary_html');
  }
});
```

#### Navigate to Next or Previous Tab
```javascript
// Navigate to the next tab
Utils.goToTab.next();

// With callback
Utils.goToTab.next({
  callback: ({ frm, prevTab, currentTab }) => {
    console.log(`Moved from ${prevTab} to ${currentTab}`);
  }
});

// Navigate to the previous tab
Utils.goToTab.previous();
```

#### Save and Navigate
```javascript
// Save form and navigate to a specific tab
Utils.goToTab.save({ 
  tab: "final_tab",
  callback: ({ frm }) => {
    frappe.msgprint('Form saved and navigated');
  }
});

// Save form and go to the next tab
Utils.goToTab.next.save({
  callback: ({ currentTab }) => {
    console.log(`Saved and moved to ${currentTab}`);
  }
});

// Save form and go to the previous tab
Utils.goToTab.previous.save();
```

### Tab Buttons & Navigation Helpers

#### Add Custom Tab Buttons for Navigation

```javascript
// Basic navigation buttons
Utils.addTabButtons();
```

#### Styling Tab Buttons
```javascript
// Add bootstrap or custom classes
Utils.addTabButtons({ 
  className: 'btn-lg shadow-sm' 
});
```

#### Saving and Navigation
```javascript
// Save on specific tabs
Utils.addTabButtons({ 
  saveTabs: ['personal_details', 'professional_profile'] 
});

// Save on all tabs
Utils.addTabButtons({ 
  saveTabs: ['*'] 
});

// Save only when going forward (NEW in v2.7.0)
Utils.addTabButtons({ 
  saveTabs: ['*'],
  saveConfig: { direction: 'forward' }
});
```

#### Replace Next Button with Custom Buttons
```javascript
Utils.addTabButtons({
  buttons: [
    {
      tab: 'final_tab',
      workflowStates: ['Processing Application'],
      label: 'Submit Form',
      variant: 'primary',
      conditional: (frm) => frm.doc.approved === true,
      callback: (frm, tab) => {
        frm.save('Submit');
      }
    },
    {
      tab: 'review_tab',
      workflowStates: ['Draft'],
      label: 'Review & Save',
      variant: 'secondary',
      callback: (frm, tab) => {
        frm.save();
      }
    }
  ]
});
```

**Button Variants**:
- `primary` - Blue button
- `secondary` - Gray button
- `destructive` - Red button
- `success` - Green button
- `outline` - Outlined button
- `ghost` - Transparent button

#### Override Default Navigation (v2.7.0 Syntax)
```javascript
Utils.addTabButtons({
  onNext: ({ frm, currentTab, nextTab, continueNavigation }) => {
    console.log(`Moving from ${currentTab} to ${nextTab}`);
    
    // Custom validation
    if (frm.doc.field_is_valid) {
      continueNavigation();
    } else {
      frappe.msgprint('Please complete current section');
    }
  },
  
  onPrev: ({ frm, prevTab, currentTab, continueNavigation }) => {
    frappe.confirm(
      'Going back will discard changes. Continue?',
      () => continueNavigation(),
      () => {} // Cancelled
    );
  }
});
```

#### Advanced Navigation with Lifecycle Hooks (NEW in v2.7.0)
```javascript
Utils.addTabButtons({
  prevLabel: 'Back',
  nextLabel: 'Continue',
  
  // Block navigation if conditions not met
  beforeNavigation: ({ frm, currentTab }) => {
    if (currentTab === 'payment_tab' && !frm.doc.payment_verified) {
      frappe.msgprint('Please verify payment before proceeding');
      return false;
    }
    return true;
  },
  
  // Custom logic before continuing
  onNext: ({ frm, currentTab, continueNavigation }) => {
    if (currentTab === 'documents_tab') {
      validateDocuments(frm).then(() => {
        continueNavigation();
      }).catch((error) => {
        frappe.msgprint(error.message);
      });
    } else {
      continueNavigation();
    }
  },
  
  // Execute after navigation completes
  afterNavigation: ({ frm, currentTab, prevTab }) => {
    console.log(`Navigated from ${prevTab} to ${currentTab}`);
    
    if (currentTab === 'summary_tab') {
      frm.refresh_field('summary_section');
    }
    
    // Track analytics
    frappe.call({
      method: 'your_app.api.track_navigation',
      args: { tab: currentTab }
    });
  }
});
```

#### Directional Save Control (NEW in v2.7.0)
```javascript
// Save only when going forward
Utils.addTabButtons({
  saveTabs: ['personal_info', 'contact_info', 'documents'],
  saveConfig: { direction: 'forward' }
});

// Save only when going backward
Utils.addTabButtons({
  saveTabs: ['review_tab'],
  saveConfig: { direction: 'backward' }
});

// Save on both directions (default)
Utils.addTabButtons({
  saveTabs: ['*'],
  saveConfig: { direction: 'bidirectional' }
});
```

#### Check for Next/Previous Tabs
```javascript
// Determine if there is a next tab
const { hasNext, nextTab } = Utils.hasNextTab();
if (hasNext) {
  console.log("Next tab:", nextTab);
}

// Determine if there is a previous tab
const { hasPrevious, previousTab } = Utils.hasPreviousTab();
if (hasPrevious) {
  console.log("Previous tab:", previousTab);
}
```

### Action Interception

#### Confirm
```javascript
// Require confirmation before workflow action
Utils.action.confirm({
  action: "Submit"
});

// With custom message and field update
Utils.action.confirm({
  action: "Submit",
  message: "Are you sure you want to submit this document?",
  debug: true,
  updateField: {
    field: "revision_count",
    value: cur_frm.doc.revision_count + 1
  }
});
```

#### Compose Email
Intercept workflow action to compose email before proceeding:

```javascript
frappe.ui.form.on("Leave Application", {
  refresh: function(frm) {
    Utils.action.composeEmail({
      action: "Reject",
      debug: true,
      setValue: {
        rejection_date: frappe.datetime.now_datetime()
      },
      composer_args: {
        recipients: frm.doc.owner,
        subject: `Update on your Leave Application: ${frm.doc.name}`,
        message: `Hello,<br><br>
                  We are unable to approve your leave application for the following reason(s):
                  <br><br>
                  <ul>
                    <li>Insufficient leave balance</li>
                    <li>Conflicting dates with team schedule</li>
                  </ul>
                  <br>
                  Thank you.`
      }
    });
  }
});
```

#### Edit Fields
Intercept workflow action to edit specific fields before proceeding:

```javascript
frappe.ui.form.on("Purchase Order", {
  refresh: function(frm) {
    Utils.action.editFields({
      action: "Approve",
      title: "Approval Details",
      fields: [
        { fieldname: "approved_by", reqd: 1 },
        { fieldname: "approval_date", reqd: 1 },
        { fieldname: "approval_notes", reqd: 0 }
      ],
      primary_action_label: "Approve & Save",
      debug: true
    });
  }
});
```

**Features:**
- Automatically fetches field metadata from the form
- Supports all standard Frappe field types
- Pre-fills current values from the document
- Validates required fields before submission
- Updates document and refreshes form after submission

### Workflow Transition and Action Retrieval

#### Retrieve All Workflow Transitions
```javascript
// Get all transitions
const transitions = Utils.workflow.getAllTransitions();

// Log all transitions
transitions.forEach(({ state, next_state, action }) =>
  console.log(`${state} -> ${next_state} via ${action}`)
);

// Check if any transitions exist
console.log(transitions.length ? "Transitions available" : "No transitions found");
```

#### Retrieve Valid Transitions for Current State
```javascript
// Get transitions from current state
const transitions = Utils.workflow.getTransitions();

// Log them
transitions.forEach(({ action, next_state }) => 
  console.log(`${action} -> ${next_state}`)
);

// Check if a specific action is available
const hasRejectAction = transitions.some(({ action }) => action === "Reject");
console.log(hasRejectAction ? "Rejection possible" : "No rejection available");
```

#### Retrieve All Future Transitions
```javascript
// Get all possible future transitions
const futureTransitions = Utils.workflow.getFutureTransitions();

// Log them
futureTransitions.forEach(({ state, next_state, action }) =>
  console.log(`${state} -> ${next_state} via ${action}`)
);

// Check if "Approved" is a future state
const isApprovalPossible = futureTransitions.some(
  ({ next_state }) => next_state === "Approved"
);
console.log(isApprovalPossible ? "Approval possible" : "Approval not possible");

// Get future transitions from a specific state
const fromDraft = Utils.workflow.getFutureTransitions({ 
  state: "Draft" 
});
```

#### Get Available Actions
```javascript
// Get all available workflow actions
const actions = Utils.workflow.getActions();
console.log(actions); // ["Approve", "Reject", "Request Changes"]

// Check if specific action is available
if (actions.includes("Approve")) {
  console.log("Approval action available");
}
```

### Site Information

#### Get Installed Apps
```javascript
const apps = Utils.site.apps();
console.log(apps); 
// [{ name: "frappe", version: "v13.0.1" }, { name: "erpnext", version: "v13.0.2" }]
```

#### Get Environment
```javascript
const env = Utils.site.getEnvironment();
console.log(`Current Environment: ${env}`); 
// "development" or "production"

// Use in conditional logic
if (Utils.site.getEnvironment() === "development") {
  console.log("Running in development mode");
}
```

### Field Change Observers

#### Watch Field Changes
Monitor fields and execute callbacks when they change:

```javascript
// Watch customer and item fields
const watchers = Utils.observer.watch({
  fields: ['customer', 'item_code'],
  callback: (value, frm) => {
    console.log(`Field changed to: ${value}`);
    frm.refresh_field('custom_status_indicator');
  },
  debug: true
});

// Save watcher IDs for later use
const customerWatcherId = watchers.customer.id;
```

#### Multiple Independent Watchers
```javascript
// Multiple watchers on the same field
const priceWatcher = Utils.observer.watch({
  fields: ['rate'],
  callback: (value, frm) => {
    if (value > 1000) {
      frappe.msgprint('High value item detected!');
    }
  }
});

const discountWatcher = Utils.observer.watch({
  fields: ['rate'],
  callback: (value, frm) => {
    if (value > 5000) {
      frm.set_value('discount_percentage', 10);
    }
  }
});
```

#### Stop Watching Fields
```javascript
// Stop specific watcher by ID
Utils.observer.unwatch({
  fields: ['customer'],
  id: customerWatcherId,
  debug: true
});

// Stop ALL watchers on a field
Utils.observer.unwatch({
  fields: ['item_code'],
  debug: true
});

// Or use the returned unwatch method
watchers.customer.unwatch();
```

#### Conditional Field Watching
```javascript
frappe.ui.form.on("Sales Order", {
  refresh: function(frm) {
    if (frm.doc.workflow_state === 'Draft') {
      Utils.observer.watch({
        fields: ['customer', 'delivery_date'],
        callback: (value, frm) => {
          frm.trigger('validate_draft_fields');
        }
      });
    }
  }
});
```

---

## Contributing

Contributions are welcome! Please follow these guidelines:

- **Fork the repository**: Create your own branch for your changes
- **Write clear code**: Follow existing coding style and include helpful comments
- **Update the README**: Ensure new features are documented with examples
- **Test thoroughly**: Verify your changes work across different scenarios
- **Submit a pull request**: Provide a clear summary of your changes

---

## License

MIT License - see LICENSE file for details

---

Utils.js is designed to streamline your Frappe form development by simplifying common tasks such as navigation, field management, and validation. With its detailed API and easy integration into your custom Frappe apps, Utils.js is an ideal tool for developers of all levels. Give it a try and see how much simpler your form development can become!
