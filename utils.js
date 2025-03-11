/**
 * @typedef {Object} ActionChain
 * @property {jQuery|null} element - The jQuery element for the action.
 * @property {function(ConfirmProps=): ActionChain} confirm - Attaches a confirmation prompt and returns the chainable action object.
 * @property {function(WarnProps=): ActionChain} warn - Attaches a warning prompt and returns the chainable action object.
 * @property {function(ThrowProps=): ActionChain} throw - Attaches a conditional check that throws an error if the condition fails, returning the chainable action object.
 */

/**
 * @typedef {Object} ConfirmProps
 * @property {string} [message] - The confirmation message. Defaults to "Are you sure you want to [action_name]?".
 * @property {function} [onConfirm] - Callback executed on confirmation. Receives a function (continueAction) to fire the original click event.
 * @property {function} [onCancel] - Callback executed if the confirmation is cancelled.
 * @property {boolean} [debug=false] - Enable debug logging.
 */

/**
 * @typedef {Object} WarnProps
 * @property {string} [title] - The title for the warning prompt.
 * @property {string} [message] - The warning message. Defaults to __( "Warning: Are you sure you want to [action_name]?" ).
 * @property {function} [onConfirm] - Callback executed on warning confirmation. Receives a function (continueAction) to fire the original click event.
 * @property {function} [onCancel] - Callback executed if the warning is cancelled.
 * @property {boolean} [debug=false] - Enable debug logging.
 */

/**
 * @typedef {Object} ThrowProps
 * @property {string} [message] - The error message to throw if the condition fails.
 *                                 Defaults to __( "Action [action_name] is not permitted." ).
 * @property {function} [conditional] - A function that receives cur_frm and returns a boolean.
 *                                     If it returns false, the throw occurs.
 * @property {boolean} [debug=false] - Enable debug logging.
 */

/**
 * Utils.js
 *
 * A collection of utility functions for Frappe forms.
 * This module simplifies form navigation, field management, validation and action interception.,
 * automatically operating on the global cur_frm.
 *
 * @module Utils
 */
const Utils = (function () {

	/**
	 * Checks if the current user has any of the specified roles.
	 *
	 * @private
	 * @param {string[]} roles - Array of role names to check.
	 * @returns {boolean} True if the user has at least one of the roles, false otherwise.
	 */
	function userHasRole(roles) {
		if (!roles || !Array.isArray(roles)) return false;
		for (let i = 0; i < roles.length; i++) {
			if (frappe.user.has_role(roles[i])) {
				return true;
			}
		}
		return false;
	}

	/**
	 * Returns an object containing an array of tab fieldnames and a mapping of tab fieldnames to their definitions.
	 * Uses the global cur_frm.
	 *
	 * @param {boolean} [exclude_hidden=false] - Whether to exclude hidden fields.
	 * @returns {Object} An object with:
	 *   - tabs {string[]} Array of tab fieldnames.
	 *   - json {Object} Mapping from tab fieldnames to field definitions.
	 */
	function getTabs(exclude_hidden = false) {
		const frm = cur_frm;
		if (!frm || !frm.meta || !frm.meta.fields) {
			console.warn("Utils.getTabs(): Invalid Frappe form object provided.");
			return { tabs: [], json: {} };
		}

		const tabs = [];
		const tabsJSON = {};

		frm.meta.fields.forEach(function (field) {
			if (field.fieldtype === "Tab Break") {
				if (exclude_hidden && field.hidden) return;
				// Evaluate dependency expression if provided.
				if (field.depends_on) {
					let expr = field.depends_on.trim();
					if (expr.indexOf("eval:") === 0) {
						expr = expr.substring(5);
					}
					try {
						// Replace "doc." with "frm.doc." to properly reference the form document.
						if (/\bdoc\./.test(expr)) {
							expr = expr.replace(/\bdoc\./g, "frm.doc.");
						}
						if (!eval(expr)) {
							console.warn("Utils.getTabs(): Tab \"" + field.label + "\" dependency check failed. Expression: " + field.depends_on);
							return;
						}
					} catch (error) {
						console.warn("Utils.getTabs(): Error evaluating dependency for tab \"" + field.label + "\": " + error.message);
						return;
					}
				}
				tabs.push(field.fieldname);
				tabsJSON[field.fieldname] = field;
			}
		});

		if (tabs.length === 0) {
			console.warn("Utils.getTabs(): No tabs found in the form.");
		}
		return { tabs: tabs, json: tabsJSON };
	}

	/**
	 * Retrieves all fields within a specified tab from the current form.
	 *
	 * @param {string} tabFieldName - The fieldname of the tab.
	 * @returns {Object} An object with:
	 *   - fields {string[]} Array of fieldnames within the tab.
	 *   - json {Object} Mapping from fieldnames to field definitions.
	 */
	function getFieldsInTab(tabFieldName) {
		const frm = cur_frm;
		if (!frm || !frm.meta || !frm.meta.fields) {
			console.warn("Utils.getFieldsInTab(): Invalid Frappe form object provided.");
			return {};
		}

		const fieldsInTab = [];
		const fieldsInTabJSON = {};
		let collectFields = false;
		let tabFound = false;

		frm.meta.fields.forEach(function (field) {
			if (field.fieldtype === "Tab Break") {
				if (field.fieldname === tabFieldName) {
					tabFound = true;
					collectFields = true;
				} else if (collectFields) {
					collectFields = false;
				}
			}
			if (collectFields && field.fieldtype !== "Tab Break") {
				fieldsInTab.push(field.fieldname);
				fieldsInTabJSON[field.fieldname] = field;
			}
		});

		if (!tabFound) {
			console.warn("Utils.getFieldsInTab(): Tab with fieldname \"" + tabFieldName + "\" not found.");
		} else if (fieldsInTab.length === 0) {
			console.warn("Utils.getFieldsInTab(): No fields found in tab \"" + tabFieldName + "\".");
		}
		return { fields: fieldsInTab, json: fieldsInTabJSON };
	}

	/**
	 * Retrieves all fields within a specified section from the current form.
	 *
	 * @param {string} sectionFieldName - The fieldname of the section.
	 * @returns {Object} An object with:
	 *   - fields {string[]} Array of fieldnames in the section.
	 *   - json {Object} Mapping from fieldnames to field definitions.
	 */
	function getFieldsInSection(sectionFieldName) {
		const frm = cur_frm;
		if (!frm || !frm.meta || !frm.meta.fields) {
			console.warn("Utils.getFieldsInSection(): Invalid Frappe form object provided.");
			return {};
		}

		const fieldsInSection = [];
		const fieldsInSectionJSON = {};
		let collectFields = false;
		let sectionFound = false;

		frm.meta.fields.forEach(function (field) {
			if (field.fieldtype === "Section Break") {
				if (field.fieldname === sectionFieldName) {
					sectionFound = true;
					collectFields = true;
				} else if (collectFields) {
					collectFields = false;
				}
			}
			if (collectFields && field.fieldtype !== "Section Break") {
				fieldsInSection.push(field.fieldname);
				fieldsInSectionJSON[field.fieldname] = field;
			}
		});

		if (!sectionFound) {
			console.warn("Utils.getFieldsInSection(): Section with fieldname \"" + sectionFieldName + "\" not found.");
		} else if (fieldsInSection.length === 0) {
			console.warn("Utils.getFieldsInSection(): No fields found in section \"" + sectionFieldName + "\".");
		}
		return { fields: fieldsInSection, json: fieldsInSectionJSON };
	}

	/**
	 * Retrieves all fields within a specified column from the current form.
	 *
	 * @param {string} columnFieldName - The fieldname of the column.
	 * @returns {Object} An object with:
	 *   - fields {string[]} Array of fieldnames in the column.
	 *   - json {Object} Mapping from fieldnames to field definitions.
	 */
	function getFieldsInColumn(columnFieldName) {
		const frm = cur_frm;
		if (!frm || !frm.meta || !frm.meta.fields) {
			console.warn("Utils.getFieldsInColumn(): Invalid Frappe form object provided.");
			return {};
		}

		const fieldsInColumn = [];
		const fieldsInColumnJSON = {};
		let collectFields = false;
		let columnFound = false;

		frm.meta.fields.forEach(function (field) {
			if (field.fieldtype === "Column Break") {
				if (field.fieldname === columnFieldName) {
					columnFound = true;
					collectFields = true;
				} else if (collectFields) {
					collectFields = false;
				}
			}
			if (collectFields && field.fieldtype !== "Column Break") {
				fieldsInColumn.push(field.fieldname);
				fieldsInColumnJSON[field.fieldname] = field;
			}
		});

		if (!columnFound) {
			console.warn("Utils.getFieldsInColumn(): Column with fieldname \"" + columnFieldName + "\" not found.");
		} else if (fieldsInColumn.length === 0) {
			console.warn("Utils.getFieldsInColumn(): No fields found in column \"" + columnFieldName + "\".");
		}
		return { fields: fieldsInColumn, json: fieldsInColumnJSON };
	}

	/**
	 * Checks mandatory fields in the current form and marks them as required if empty.
	 *
	 * @param {string[]} mandatory_fields - Array of field names to check.
	 * @returns {Array|boolean} Array of missing field names if any are empty; otherwise, true.
	 */
	function checkMandatory(mandatory_fields) {
		const frm = cur_frm;
		if (!frm || !frm.meta || !frm.meta.fields) {
			console.warn("Utils.checkMandatory(): Invalid Frappe form object provided.");
			return [];
		}

		const missing_fields = [];
		mandatory_fields.forEach(function (field) {
			if (frm.fields_dict[field]) {
				if (!frm.doc[field]) {
					frm.set_df_property(field, "reqd", 1);
					frm.refresh_field(field);
					missing_fields.push(field);
				}
			} else {
				console.warn("Utils.checkMandatory(): Field \"" + field + "\" does not exist in the form or cannot be marked mandatory.");
			}
		});
		return missing_fields.length > 0 ? missing_fields : true;
	}

	/**
	 * Changes the workflow state of the current form.
	 *
	 * @param {string} new_state - The new workflow state.
	 * @param {string} [current_state_check] - Optional. Only change if current workflow state matches this.
	 */
	function changeWorkflowState(new_state, current_state_check) {
		const frm = cur_frm;
		if (!frm) {
			console.warn("Utils.changeWorkflowState(): Invalid Frappe form object provided.");
			return;
		}
		if (current_state_check && frm.doc.workflow_state !== current_state_check) {
			console.warn("Utils.changeWorkflowState(): Current state is not " + current_state_check + ". State change aborted.");
			return;
		}
		frm.set_value("workflow_state", new_state);
		frm.refresh_field("workflow_state");
	}

	/**
	 * Sets the read_only property on specified fields of the current form.
	 *
	 * @param {string[]} read_only_fields - Array of field names to update.
	 * @param {string[]} [exception_states=[]] - Array of workflow states during which fields remain editable.
	 */
	function makeReadOnly(read_only_fields, exception_states = []) {
		const frm = cur_frm;
		if (!frm || !frm.doc || !frm.fields_dict) {
			console.warn("Utils.makeReadOnly(): Invalid Frappe form object provided.");
			return [];
		}
		const isExceptionState = exception_states.indexOf(frm.doc.workflow_state) !== -1;
		read_only_fields.forEach(function (field) {
			if (frm.fields_dict[field]) {
				frm.set_df_property(field, "read_only", isExceptionState ? 0 : 1);
				frm.refresh_field(field);
			} else {
				console.warn("Utils.makeReadOnly(): Field \"" + field + "\" does not exist in the form or cannot be set read_only.");
			}
		});
	}

	/**
	 * Hides or shows specified fields in the current form based on workflow state.
	 *
	 * @param {string[]} fields_to_hide - Array of field names to hide.
	 * @param {string[]} [exception_states=[]] - Array of workflow states where the fields remain visible.
	 */
	function hideFields(fields_to_hide, exception_states = []) {
		const frm = cur_frm;
		if (!frm || !frm.doc || !frm.fields_dict) {
			console.warn("Utils.hideFields(): Invalid Frappe form object provided.");
			return [];
		}
		const isExceptionState = exception_states.indexOf(frm.doc.workflow_state) !== -1;
		fields_to_hide.forEach(function (field) {
			if (frm.fields_dict[field]) {
				frm.set_df_property(field, "hidden", isExceptionState ? 0 : 1);
				frm.refresh_field(field);
			} else {
				console.warn("Utils.hideFields(): Field \"" + field + "\" does not exist in the form or cannot be hidden.");
			}
		});
	}

	/**
	 * Navigates to a specified tab in the current form and scrolls to its first valid field.
	 *
	 * @param {string} tabFieldName - The fieldname of the target tab.
	 */
	function goToTab(tabFieldName) {
		const frm = cur_frm;
		if (!frm || !frm.meta || !frm.meta.fields) {
			console.warn("Utils.goToTab(): Invalid Frappe form object provided.");
			return;
		}
		const result = getFieldsInTab(tabFieldName);
		const fields = result.fields;
		const json = result.json;
		if (!fields || fields.length === 0) {
			console.warn("Utils.goToTab(): Tab with fieldname \"" + tabFieldName + "\" not found or contains no valid fields.");
			return;
		}
		const firstValidField = fields.find(function (fieldname) {
			const fieldMeta = json[fieldname];
			return fieldMeta && fieldMeta.fieldtype !== "Column Break" && fieldMeta.fieldtype !== "Section Break";
		});
		if (!firstValidField) {
			console.warn("Utils.goToTab(): No scrollable fields found in tab \"" + tabFieldName + "\".");
			return;
		}
		frm.scroll_to_field(firstValidField);
	}

	/**
	 * Navigates to the next tab in the current form.
	 */
	goToTab.next = function () {
		const frm = cur_frm;
		const tabsData = getTabs(true);
		const tabs = tabsData.tabs;
		if (tabs.length === 0) {
			console.warn("Utils.goToTab.next(): No tabs found in the form.");
			return;
		}
		const activeTabLink = $("#form-tabs li a.active");
		if (!activeTabLink.length) {
			console.warn("Utils.goToTab.next(): No active tab found.");
			return;
		}
		const currentTabFieldname = activeTabLink.data("fieldname");
		const currentTabIndex = tabs.indexOf(currentTabFieldname);
		if (currentTabIndex === -1) {
			console.warn("Utils.goToTab.next(): Current tab not found in the list of tabs.");
			return;
		}
		const nextTabIndex = currentTabIndex + 1;
		if (nextTabIndex < tabs.length) {
			const nextTabFieldname = tabs[nextTabIndex];
			goToTab(nextTabFieldname);
		} else {
			console.warn("Utils.goToTab.next(): No next tab found. You are already on the last tab.");
		}
	};

	/**
	 * Navigates to the previous tab in the current form.
	 */
	goToTab.previous = function () {
		const frm = cur_frm;
		const tabsData = getTabs(true);
		const tabs = tabsData.tabs;
		if (tabs.length === 0) {
			console.warn("Utils.goToTab.previous(): No tabs found in the form.");
			return;
		}
		const activeTabLink = $("#form-tabs li a.active");
		if (!activeTabLink.length) {
			console.warn("Utils.goToTab.previous(): No active tab found.");
			return;
		}
		const currentTabFieldname = activeTabLink.data("fieldname");
		const currentTabIndex = tabs.indexOf(currentTabFieldname);
		if (currentTabIndex === -1) {
			console.warn("Utils.goToTab.previous(): Current tab not found in the list of tabs.");
			return;
		}
		const previousTabIndex = currentTabIndex - 1;
		if (previousTabIndex >= 0) {
			const previousTabFieldname = tabs[previousTabIndex];
			goToTab(previousTabFieldname);
		} else {
			console.warn("Utils.goToTab.previous(): No previous tab found. You are already on the first tab.");
		}
	};

	/**
	 * Saves the current form and then executes the given callback.
	 *
	 * @param {string|function} tabFieldNameOrCallback - The target tab fieldname or callback function.
	 * @param {function} callback - Callback to execute after saving.
	 */
	function saveCallback(tabFieldNameOrCallback, callback) {
		const frm = cur_frm;
		if (frm.is_dirty()) {
			frm.save(null, function () {
				if (typeof tabFieldNameOrCallback === "function") {
					tabFieldNameOrCallback(frm);
				} else if (typeof callback === "function") {
					callback(frm, tabFieldNameOrCallback);
				} else {
					console.error("Utils.saveCallback(): No valid callback provided.");
				}
			});
		} else {
			if (typeof tabFieldNameOrCallback === "function") {
				tabFieldNameOrCallback(frm);
			} else if (typeof callback === "function") {
				callback(frm, tabFieldNameOrCallback);
			} else {
				console.error("Utils.saveCallback(): No valid callback provided.");
			}
		}
	}

	/**
	 * Saves the current form and navigates to the specified tab.
	 *
	 * @param {string} tabFieldName - The fieldname of the target tab.
	 */
	goToTab.save = function (tabFieldName) {
		saveCallback(tabFieldName, goToTab);
	};

	/**
	 * Saves the current form and navigates to the next tab.
	 */
	goToTab.next.save = function () {
		saveCallback(goToTab.next);
	};

	/**
	 * Saves the current form and navigates to the previous tab.
	 */
	goToTab.previous.save = function () {
		saveCallback(goToTab.previous);
	};

	/**
	 * Determines if there is a next tab in the current form.
	 *
	 * @returns {Object} An object with properties:
	 *   - hasNext {boolean} True if a next tab exists.
	 *   - nextTabFieldname {string|null} The fieldname of the next tab, or null.
	 */
	function hasNextTab() {
		const frm = cur_frm;
		const tabsData = getTabs(true);
		const tabs = tabsData.tabs;
		if (tabs.length === 0) {
			console.warn("Utils.hasNextTab(): No tabs found in the form.");
			return { hasNext: false };
		}
		const activeTabLink = $("#form-tabs li a.active");
		if (!activeTabLink.length) {
			console.warn("Utils.hasNextTab(): No active tab found.");
			return { hasNext: false };
		}
		const currentTabFieldname = activeTabLink.data("fieldname");
		const currentTabIndex = tabs.indexOf(currentTabFieldname);
		if (currentTabIndex === -1) {
			console.warn("Utils.hasNextTab(): Current tab not found in the list of tabs.");
			return { hasNext: false };
		}
		const nextTabIndex = currentTabIndex + 1;
		return {
			hasNext: nextTabIndex < tabs.length,
			nextTabFieldname: tabs[nextTabIndex] || null
		};
	}

	/**
	 * Determines if there is a previous tab in the current form.
	 *
	 * @returns {Object} An object with properties:
	 *   - hasPrevious {boolean} True if a previous tab exists.
	 *   - previousTabFieldname {string|null} The fieldname of the previous tab, or null.
	 */
	function hasPreviousTab() {
		const frm = cur_frm;
		const tabsData = getTabs(true);
		const tabs = tabsData.tabs;
		if (tabs.length === 0) {
			console.warn("Utils.hasPreviousTab(): No tabs found in the form.");
			return { hasPrevious: false };
		}
		const activeTabLink = $("#form-tabs li a.active");
		if (!activeTabLink.length) {
			console.warn("Utils.hasPreviousTab(): No active tab found.");
			return { hasPrevious: false };
		}
		const currentTabFieldname = activeTabLink.data("fieldname");
		const currentTabIndex = tabs.indexOf(currentTabFieldname);
		if (currentTabIndex === -1) {
			console.warn("Utils.hasPreviousTab(): Current tab not found in the list of tabs.");
			return { hasPrevious: false };
		}
		const previousTabIndex = currentTabIndex - 1;
		return {
			hasPrevious: previousTabIndex >= 0,
			previousTabFieldname: tabs[previousTabIndex] || null
		};
	}

	/**
	 * Adds navigation buttons (Previous, Next, and optionally custom buttons) to each tab-pane of the current form.
	 * The buttons are appended to each .tab-pane element.
	 *
	 * Options can be provided via a props object:
	 *   - saveTabs {string[]} (Optional): Array of tab fieldnames (or '*' for all) that trigger a save before navigation.
	 *   - buttons {Object|Object[]} (Optional): Custom button configuration(s) to replace the Next button on specific tabs.
	 *       Each button configuration may have:
	 *         - tab {string}: The fieldname where the button should be rendered.
	 *         - workflowStates {string[]} (Optional): Allowed workflow states for the button to render.
	 *             If not provided, the button shows regardless of the current workflow state.
	 *         - label {string} (Optional): The label to display on the button. Defaults to "Submit".
	 *         - variant {string} (Optional): One of "Primary", "Secondary", "Destructive", "Outline", or "Ghost".
	 *             Determines the CSS class for styling. Defaults to "Primary".
	 *         - callback {function} (Optional): Callback to execute when the button is clicked.
	 *             If omitted, logs "Custom button clicked on tab <tab>".
	 *         - conditional {function} (Optional): A function that receives cur_frm and returns true if the button should be rendered.
	 *
	 * @param {Object} [props] - Optional configuration object.
	 *
	 * @example
	 * // Example 1: Default navigation (no custom buttons or save behavior).
	 * Utils.addTabButtons();
	 *
	 * @example
	 * // Example 2: Save on all tabs before navigation.
	 * Utils.addTabButtons({ saveTabs: ['*'] });
	 *
	 * @example
	 * // Example 3: Render a custom button on "final_tab" when workflow state is "Processing Application".
	 * // The button is labeled "Submit Form" and appears only if a conditional check passes.
	 * Utils.addTabButtons({
	 *   buttons: {
	 *     tab: 'final_tab',
	 *     workflowStates: ['Processing Application'],
	 *     label: 'Submit Form',
	 *     conditional: function(cur_frm) { return cur_frm.doc.approved === true; },
	 *     callback: function(frm, tab) {
	 *       console.log('Submit Form button clicked on tab ' + tab);
	 *     }
	 *   }
	 * });
	 *
	 * @example
	 * // Example 4: Render multiple custom buttons on different tabs.
	 * Utils.addTabButtons({
	 *   buttons: [
	 *     {
	 *       tab: 'final_tab',
	 *       workflowStates: ['Processing Application'],
	 *       label: 'Submit Form',
	 *       variant: 'Secondary',
	 *       callback: function(frm, tab) {
	 *         console.log('Submit Form button clicked on tab ' + tab);
	 *       }
	 *     },
	 *     {
	 *       tab: 'review_tab',
	 *       workflowStates: ['Draft'],
	 *       label: 'Review & Save',
	 *       variant: 'Destructive',
	 *       callback: function(frm, tab) {
	 *         console.log('Review & Save button clicked on tab ' + tab);
	 *       }
	 *     }
	 *   ]
	 * });
	 */
	function addTabButtons(props) {
		props = props || {};
		// Normalize buttons prop: if provided as a single object, wrap it in an array.
		if (props.buttons && !Array.isArray(props.buttons)) {
			props.buttons = [props.buttons];
		}
		// Mapping for variant to CSS class.
		const variantMapping = {
			Primary: "btn-primary",
			Secondary: "btn-secondary",
			Destructive: "btn-danger",
			Outline: "btn-outline",
			Ghost: "btn-ghost"
		};

		const frm = cur_frm;
		const tabsData = Utils.getTabs(true);
		const tabs = tabsData.tabs;

		// Append navigation buttons to each .tab-pane.
		$(".tab-pane").each(function () {
			const tabId = $(this).attr("id");
			const tabFieldname = tabId.split("-").pop().replace("-tab", "");
			const currentTabIndex = tabs.indexOf(tabFieldname);

			// Build Previous button (left column)
			const previousButtonHTML =
				currentTabIndex > 0
					? '<button class="btn btn-primary float-left tab-navigation" data-direction="previous">Previous</button>'
					: '<button class="btn btn-primary float-left invisible" disabled>Previous</button>';

			// Determine custom buttons for this tab.
			let customButtonsHTML = "";
			if (props.buttons && props.buttons.length) {
				// Filter custom button configurations applicable to this tab.
				const filtered = props.buttons.filter(function (btn) {
					return (
						btn.tab === tabFieldname &&
						(
							!btn.workflowStates ||
							(Array.isArray(btn.workflowStates) && btn.workflowStates.indexOf(frm.doc.workflow_state) !== -1)
						) &&
						(typeof btn.conditional !== "function" || btn.conditional(frm))
					);
				});
				if (filtered.length) {
					customButtonsHTML = filtered
						.map(function (btn, index) {
							const label = btn.label || "Submit";
							const variantClass = btn.variant && variantMapping[btn.variant]
								? variantMapping[btn.variant]
								: "btn-primary";
							return `<button class="btn ${variantClass} float-right custom-tab-button" data-tab="${tabFieldname}" data-cb-index="${index}">${label}</button>`;
						})
						.join(" ");
				}
			}

			// Decide what to render in the right column.
			const rightButtonHTML =
				customButtonsHTML !== ""
					? customButtonsHTML
					: currentTabIndex < tabs.length - 1
						? '<button class="btn btn-primary float-right tab-navigation" data-direction="next">Next</button>'
						: '<button class="btn btn-primary float-right invisible" disabled>Next</button>';

			const buttonHtml = `
		  <div class="flex form-section-buttons justify-between nav-buttons w-100">
			<div class="flex section-body w-100 py-3">
			  <div class="form-column col-sm-6">
				${previousButtonHTML}
			  </div>
			  <div class="form-column col-sm-6">
				${rightButtonHTML}
			  </div>
			</div>
		  </div>
		`;
			$(this).append(buttonHtml);
		});

		// Event handler for navigation buttons (Previous/Next).
		$(document).on("click", ".tab-navigation", function () {
			const direction = $(this).data("direction");
			const currentTabFieldname = $("#form-tabs li a.active").data("fieldname");
			const saveTabs = props.saveTabs || [];
			if (saveTabs.indexOf("*") !== -1 || saveTabs.indexOf(currentTabFieldname) !== -1) {
				if (direction === "previous") {
					Utils.goToTab.previous.save();
				} else {
					Utils.goToTab.next.save();
				}
			} else {
				if (direction === "previous") {
					Utils.goToTab.previous();
				} else {
					Utils.goToTab.next();
				}
			}
		});

		// Event handler for custom buttons.
		$(document).on("click", ".custom-tab-button", function () {
			const tab = $(this).data("tab");
			const cbIndex = parseInt($(this).data("cb-index"), 10);
			// Recompute applicable custom buttons for this tab.
			const applicableButtons = (props.buttons || []).filter(function (btn) {
				return (
					btn.tab === tab &&
					(
						!btn.workflowStates ||
						(Array.isArray(btn.workflowStates) && btn.workflowStates.indexOf(frm.doc.workflow_state) !== -1)
					) &&
					(typeof btn.conditional !== "function" || btn.conditional(frm))
				);
			});
			const btnConfig = applicableButtons[cbIndex];
			if (btnConfig && typeof btnConfig.callback === "function") {
				btnConfig.callback(frm, tab);
			} else {
				console.log("Custom button clicked on tab " + tab);
			}
		});
	}

	/**
	 * Determines if there is a next tab in the current form.
	 *
	 * @returns {Object} An object with properties:
	 *   - hasNext {boolean} True if a next tab exists.
	 *   - nextTabFieldname {string|null} The fieldname of the next tab, or null.
	 */
	function hasNextTab() {
		const frm = cur_frm;
		const tabsData = Utils.getTabs(true);
		const tabs = tabsData.tabs;
		if (tabs.length === 0) {
			console.warn("Utils.hasNextTab(): No tabs found in the form.");
			return { hasNext: false };
		}
		const activeTabLink = $("#form-tabs li a.active");
		if (!activeTabLink.length) {
			console.warn("Utils.hasNextTab(): No active tab found.");
			return { hasNext: false };
		}
		const currentTabFieldname = activeTabLink.data("fieldname");
		const currentTabIndex = tabs.indexOf(currentTabFieldname);
		if (currentTabIndex === -1) {
			console.warn("Utils.hasNextTab(): Current tab not found in the list of tabs.");
			return { hasNext: false };
		}
		const nextTabIndex = currentTabIndex + 1;
		return {
			hasNext: nextTabIndex < tabs.length,
			nextTabFieldname: tabs[nextTabIndex] || null
		};
	}

	/**
	 * Determines if there is a previous tab in the current form.
	 *
	 * @returns {Object} An object with properties:
	 *   - hasPrevious {boolean} True if a previous tab exists.
	 *   - previousTabFieldname {string|null} The fieldname of the previous tab, or null.
	 */
	function hasPreviousTab() {
		const frm = cur_frm;
		const tabsData = Utils.getTabs(true);
		const tabs = tabsData.tabs;
		if (tabs.length === 0) {
			console.warn("Utils.hasPreviousTab(): No tabs found in the form.");
			return { hasPrevious: false };
		}
		const activeTabLink = $("#form-tabs li a.active");
		if (!activeTabLink.length) {
			console.warn("Utils.hasPreviousTab(): No active tab found.");
			return { hasPrevious: false };
		}
		const currentTabFieldname = activeTabLink.data("fieldname");
		const currentTabIndex = tabs.indexOf(currentTabFieldname);
		if (currentTabIndex === -1) {
			console.warn("Utils.hasPreviousTab(): Current tab not found in the list of tabs.");
			return { hasPrevious: false };
		}
		const previousTabIndex = currentTabIndex - 1;
		return {
			hasPrevious: previousTabIndex >= 0,
			previousTabFieldname: tabs[previousTabIndex] || null
		};
	}

	/**
	 * Retrieves and returns an array of decoded action names from the current form's action buttons.
	 *
	 * This function iterates over all action buttons contained in `cur_frm.page.actions` and
	 * extracts the value of the `data-label` attribute (decoded from URI encoding) from each button.
	 * The resulting array represents the available workflow actions.
	 *
	 * @returns {string[]} An array of decoded action names.
	 *
	 * @example
	 * // Retrieve the list of available workflow actions:
	 * const actionNames = Utils.getActions();
	 * console.log(actionNames); // e.g. ["Approve", "Reject", "Cancel"]
	 */
	const getActions = () => {
		const actionsList = [];
		cur_frm.page.actions.find('a:has([data-label])').each((_, el) => {
			const $btn = $(el);
			const labelEncoded = $btn.find('[data-label]').attr('data-label');
			const label = labelEncoded ? decodeURIComponent(labelEncoded) : "";
			actionsList.push(label);
		});
		return actionsList;
	};

	/**
	 * Finds and returns a workflow action chain for intercepting specified action.
	 *
	 * This function searches the current form's actions for an action button that matches
	 * the provided action name (the comparison is done after URI-decoding the button’s `data-label`).
	 * If found, it returns a chainable object with methods to attach various prompts:
	 *
	 * - **confirm(ConfirmProps): ActionChain**  
	 *   Attaches a confirmation prompt. When the user confirms, the original workflow action is triggered.
	 *
	 * - **warn(WarnProps): ActionChain**  
	 *   Attaches a warning prompt using `frappe.warn` with a specified title and message.
	 *
	 * - **throw(ThrowProps): ActionChain**  
	 *   Evaluates a condition via a required conditional function. If the condition returns false,
	 *   it throws an error with the specified title and message; if the condition passes, nothing happens.
	 *
	 * If the action button is not found, an error message is displayed and the function returns `null`.
	 *
	 * @param {string} action_name - The plain text name of the workflow action (e.g., "Approve").
	 * @param {Object} [options={}] - Optional default configuration for the chainable methods.
	 * @param {boolean} [options.debug=false] - Enable debug logging.
	 * @returns {ActionChain|null} A chainable action object with the following properties:
	 *   - **element**: {jQuery} The jQuery element representing the action button.
	 *   - **confirm(ConfirmProps): ActionChain** - Attaches a confirmation prompt and returns the chain.
	 *   - **warn(WarnProps): ActionChain** - Attaches a warning prompt (using `frappe.warn`) and returns the chain.
	 *   - **throw(ThrowProps): ActionChain** - Evaluates a condition and, if false, throws an error; returns the chain.
	 *
	 * @example
	 * // Example: Attaching a confirmation prompt to the "Approve" action.
	 * const approveAction = Utils.action("Approve", { debug: true });
	 * if (approveAction) {
	 *   approveAction.confirm({
	 *     message: "Are you sure you want to approve this document?",
	 *     onConfirm: (continueAction) => {
	 *       console.log("Approval confirmed.");
	 *       continueAction();
	 *     },
	 *     onCancel: () => {
	 *       console.log("Approval cancelled.");
	 *     },
	 *     debug: true
	 *   });
	 * }
	 *
	 * @example
	 * // Example: Attaching a warning prompt to the "Delete" action.
	 * const deleteAction = Utils.action("Delete", { debug: true });
	 * if (deleteAction) {
	 *   deleteAction.warn({
	 *     title: "Warning",
	 *     message: "This will permanently delete the document. Continue?",
	 *     onConfirm: (continueAction) => {
	 *       console.log("Deletion warning confirmed.");
	 *       continueAction();
	 *     },
	 *     onCancel: () => {
	 *       console.log("Deletion warning cancelled.");
	 *     },
	 *     debug: true
	 *   });
	 * }
	 *
	 * @example
	 * // Example: Attaching a throw condition to the "Submit" action.
	 * const submitAction = Utils.action("Submit", { debug: true });
	 * if (submitAction) {
	 *   submitAction.throw({
	 *     title: "Error",
	 *     message: "Submission is not allowed because the document is incomplete.",
	 *     conditional: (frm) => frm.doc.is_complete === true,
	 *     debug: true
	 *   });
	 * }
	 */
	const action = (action_name, options = {}) => {
		const actionsContainer = cur_frm.page.actions.get(0);
		const encodedAction = encodeURIComponent(action_name);

		const actionObj = {
			element: null,
			/**
			 * Attaches a confirmation prompt to the action.
			 * @param {Object} [props={}] - Confirmation-specific properties.
			 * @param {string} [props.message] - The confirmation message.
			 * @param {function} [props.onConfirm] - Callback executed upon confirmation. Receives a function (continueAction) to trigger the action.
			 * @param {function} [props.onCancel] - Callback executed if confirmation is cancelled.
			 * @param {boolean} [props.debug] - Enable debug logging.
			 * @returns {ActionChain} The chainable action object.
			 */
			confirm: (props = {}) => {
				const mergedOptions = Object.assign({}, options, props);
				const debug = mergedOptions.debug || false;
				const message = mergedOptions.message || `Are you sure you want to ${action_name}?`;
				const onConfirm = mergedOptions.onConfirm;
				const onCancel = mergedOptions.onCancel;

				const findClosestAnchor = (el) => {
					while (el && el !== actionsContainer && el.tagName !== 'A') {
						el = el.parentNode;
					}
					return el;
				};

				const capturingHandler = (e) => {
					const target = findClosestAnchor(e.target);
					if (target && target.tagName === 'A' && target.querySelector(`[data-label="${encodedAction}"]`)) {
						e.stopPropagation();
						e.preventDefault();
						actionObj.element = target;
						frappe.confirm(
							message,
							() => {
								actionsContainer.removeEventListener("click", capturingHandler, true);
								if (typeof onConfirm === "function") {
									onConfirm(() => {
										target.click();
										actionsContainer.addEventListener("click", capturingHandler, true);
									});
								} else {
									target.click();
									actionsContainer.addEventListener("click", capturingHandler, true);
								}
								if (debug) {
									console.debug(`Utils.action.confirm(): Confirmed action "${action_name}"`);
								}
							},
							() => {
								if (typeof onCancel === "function") {
									onCancel();
								}
								if (debug) {
									console.debug(`Utils.action.confirm(): Cancelled action "${action_name}"`);
								}
							}
						);
					}
				};

				actionsContainer.addEventListener("click", capturingHandler, true);
				if (debug) {
					console.log(`Custom capturing handler bound for action "${action_name}" using frappe.confirm.`);
				}
				return actionObj;
			},
			/**
			 * Attaches a warning prompt to the action using frappe.warn.
			 * @param {Object} [props={}] - Warning-specific properties.
			 * @param {string} [props.title] - The title for the warning prompt. Defaults to "Warning".
			 * @param {string} [props.message] - The warning message.
			 * @param {function} [props.onConfirm] - Callback executed upon confirmation. Receives a function (continueAction) to trigger the action.
			 * @param {function} [props.onCancel] - Callback executed if warning is cancelled.
			 * @param {boolean} [props.debug] - Enable debug logging.
			 * @returns {ActionChain} The chainable action object.
			 */
			warn: (props = {}) => {
				const mergedOptions = Object.assign({}, options, props);
				const debug = mergedOptions.debug || false;
				const title = mergedOptions.title || "Warning";
				const message = mergedOptions.message || `Warning: Are you sure you want to ${action_name}?`;
				const onConfirm = mergedOptions.onConfirm;
				const onCancel = mergedOptions.onCancel;

				const findClosestAnchor = (el) => {
					while (el && el !== actionsContainer && el.tagName !== 'A') {
						el = el.parentNode;
					}
					return el;
				};

				const capturingHandler = (e) => {
					const target = findClosestAnchor(e.target);
					if (target && target.tagName === 'A' && target.querySelector(`[data-label="${encodedAction}"]`)) {
						e.stopPropagation();
						e.preventDefault();
						actionObj.element = target;
						frappe.warn(
							title,
							message,
							() => {
								actionsContainer.removeEventListener("click", capturingHandler, true);
								if (typeof onConfirm === "function") {
									onConfirm(() => {
										target.click();
										actionsContainer.addEventListener("click", capturingHandler, true);
									});
								} else {
									target.click();
									actionsContainer.addEventListener("click", capturingHandler, true);
								}
								if (debug) {
									console.debug(`Utils.action.warn(): Confirmed warning for action "${action_name}"`);
								}
							},
							() => {
								if (typeof onCancel === "function") {
									onCancel();
								}
								if (debug) {
									console.debug(`Utils.action.warn(): Cancelled warning for action "${action_name}"`);
								}
							}
						);
					}
				};

				actionsContainer.addEventListener("click", capturingHandler, true);
				if (debug) {
					console.log(`Custom capturing handler bound for warn on action "${action_name}" using frappe.warn.`);
				}
				return actionObj;
			},
			/**
			 * Evaluates a condition and, if false, throws an error using frappe.throw.
			 * @param {Object} [props={}] - Throw-specific properties.
			 * @param {string} [props.title] - The title for the error prompt. Defaults to "Error".
			 * @param {string} [props.message] - The error message.
			 * @param {function} props.conditional - A required function that receives cur_frm and returns a boolean.
			 *   If it returns false, an error is thrown.
			 * @param {boolean} [props.debug] - Enable debug logging.
			 * @returns {ActionChain} The chainable action object.
			 */
			throw: (props = {}) => {
				const mergedOptions = Object.assign({}, options, props);
				const debug = mergedOptions.debug || false;
				const title = mergedOptions.title || "Error";
				const message = mergedOptions.message || `Action ${action_name} is not permitted.`;
				const conditional = mergedOptions.conditional;

				// If no conditional is provided, do nothing.
				if (typeof conditional !== "function") {
					if (debug) {
						console.debug(`Utils.action.throw(): No conditional provided for action "${action_name}". Doing nothing.`);
					}
					return actionObj;
				}

				const findClosestAnchor = (el) => {
					while (el && el !== actionsContainer && el.tagName !== 'A') {
						el = el.parentNode;
					}
					return el;
				};

				const capturingHandler = (e) => {
					const target = findClosestAnchor(e.target);
					if (target && target.tagName === 'A' && target.querySelector(`[data-label="${encodedAction}"]`)) {
						e.stopPropagation();
						e.preventDefault();
						actionObj.element = target;
						const conditionResult = conditional(cur_frm);
						if (!conditionResult) {
							if (debug) {
								console.debug(`Utils.action.throw(): Condition failed for action "${action_name}", throwing error with title "${title}".`);
							}
							frappe.throw(message, title);
						} else {
							if (debug) {
								console.debug(`Utils.action.throw(): Condition passed for action "${action_name}", allowing click.`);
							}
							actionsContainer.removeEventListener("click", capturingHandler, true);
							target.click();
							actionsContainer.addEventListener("click", capturingHandler, true);
						}
					}
				};

				actionsContainer.addEventListener("click", capturingHandler, true);
				if (debug) {
					console.log(`Custom capturing handler bound for throw on action "${action_name}".`);
				}
				return actionObj;
			}
		};

		return actionObj;
	};

	// Expose public API method.
	return {
		getTabs: getTabs,
		getFieldsInTab: getFieldsInTab,
		getFieldsInSection: getFieldsInSection,
		getFieldsInColumn: getFieldsInColumn,
		checkMandatory: checkMandatory,
		changeWorkflowState: changeWorkflowState,
		makeReadOnly: makeReadOnly,
		hideFields: hideFields,
		goToTab: goToTab,
		addTabButtons: addTabButtons,
		hasNextTab: hasNextTab,
		hasPreviousTab: hasPreviousTab,
		getActions: getActions,
		action: action
	};
})();
