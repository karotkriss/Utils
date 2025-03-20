/**
 * Utils.js
 *
 * A collection of utility functions for Frappe forms.
 * This module simplifies form navigation, field management, workflow tranistions, action interception and instance information.,
 * automatically operating on the global cur_frm.
 *
 * @version 1.3.0
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
	 * Helper function to standardize the format of allowed roles
	 * @private
	 * @param {String|Array|Object} allowed - The allowed roles in various formats
	 * @returns {Array} - Array of role names
	 */
	function formatAllowedRoles(allowed) {
		try {
			if (!allowed) return [];

			// Handle string format (comma-separated)
			if (typeof allowed === 'string') {
				return allowed.split(',').map(role => role.trim()).filter(Boolean);
			}

			// Handle array format
			if (Array.isArray(allowed)) {
				return allowed.map(role =>
					typeof role === 'string' ? role.trim() : String(role)
				).filter(Boolean);
			}

			// Handle object format
			if (typeof allowed === 'object') {
				return Object.keys(allowed).filter(Boolean);
			}

			return [];
		} catch (error) {
			console.warn("Error formatting allowed roles:", error);
			return [];
		}
	}

	/**
	 * Retrieves all "Tab Break" fields from the global form (cur_frm) and returns an object containing:
	 * - an array of tab fieldnames,
	 * - a JSON mapping of each tab fieldname to its corresponding field definition.
	 *
	 * This function also evaluates any dependency expressions specified on the tab fields.
	 *
	 * @param {Object} [props={}] - The configuration object.
	 * @param {boolean} [props.excludeHidden=false] - Flag indicating whether to exclude hidden tabs.
	 * @returns {{tabs: string[], json: Object}} An object containing:
	 *   - tabs: An array of tab fieldnames.
	 *   - json: An object mapping tab fieldnames to their field definitions.
	 *
	 * @example
	 * // Retrieve tabs while excluding hidden ones
	 * const { tabs, json } = Utils.getTabs({ excludeHidden: true });
	 * console.log("Tabs:", tabs);
	 * console.log("Tab Definitions:", json);
	 */
	const getTabs = ({ excludeHidden = false } = {}) => {
		const frm = cur_frm;
		if (!frm?.meta?.fields) {
			console.warn("Utils.getTabs(): Invalid Frappe form object provided.");
			return { tabs: [], json: {} };
		}

		const tabs = [];
		const tabsJSON = {};

		frm.meta.fields.forEach(field => {
			if (field.fieldtype === "Tab Break") {
				if (excludeHidden && field.hidden) return;
				if (field.depends_on) {
					let expr = field.depends_on.trim();
					if (expr.startsWith("eval:")) expr = expr.substring(5);
					try {
						// Replace "doc." with "frm.doc." to properly reference the form document.
						if (/\bdoc\./.test(expr)) {
							expr = expr.replace(/\bdoc\./g, "frm.doc.");
						}
						if (!eval(expr)) {
							console.warn(`Utils.getTabs(): Tab "${field.label}" dependency check failed. Expression: ${field.depends_on}`);
							return;
						}
					} catch (error) {
						console.warn(`Utils.getTabs(): Error evaluating dependency for tab "${field.label}": ${error.message}`);
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
		return { tabs, json: tabsJSON };
	}

	/**
	 * Retrieves all fields within a specified tab from the current form.
	 *
	 * @param {Object} props - The configuration object.
	 * @param {string} props.tab - The fieldname of the target tab.
	 * @returns {{fields: string[], json: Object}} An object containing:
	 *   - fields: An array of fieldnames present within the tab.
	 *   - json: An object mapping each fieldname to its field definition.
	 *
	 * @example
	 * // Retrieve fields in a tab named "my_tab"
	 * const { fields, json } = Utils.getFieldsInTab({ tab: "my_tab" });
	 * console.log("Fields in tab:", fields);
	 * console.log("Field definitions:", json);
	 */
	const getFieldsInTab = ({ tab } = {}) => {
		const frm = cur_frm;
		if (!frm?.meta?.fields) {
			console.warn("Utils.getFieldsInTab(): Invalid Frappe form object provided.");
			return {};
		}

		const fieldsInTab = [];
		const fieldsInTabJSON = {};
		let collectFields = false;
		let tabFound = false;

		frm.meta.fields.forEach(field => {
			if (field.fieldtype === "Tab Break") {
				if (field.fieldname === tab) {
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
			console.warn(`Utils.getFieldsInTab(): Tab with fieldname "${tab}" not found.`);
		} else if (fieldsInTab.length === 0) {
			console.warn(`Utils.getFieldsInTab(): No fields found in tab "${tab}".`);
		}

		return { fields: fieldsInTab, json: fieldsInTabJSON };
	}


	/**
	 * Retrieves all fields within a specified section from the current form.
	 *
	 * @param {Object} props - The configuration object.
	 * @param {string} props.sectionFieldName - The fieldname of the target section.
	 * @returns {{fields: string[], json: Object}} An object containing:
	 *   - fields: An array of fieldnames present within the section.
	 *   - json: An object mapping each fieldname to its field definition.
	 *
	 * @example
	 * // Retrieve fields in a section named "my_section"
	 * const { fields, json } = Utils.getFieldsInSection({ sectionFieldName: "my_section" });
	 * console.log("Section Fields:", fields);
	 * console.log("Field Definitions:", json);
	 */
	const getFieldsInSection = ({ sectionFieldName } = {}) => {
		const frm = cur_frm;
		if (!frm?.meta?.fields) {
			console.warn("Utils.getFieldsInSection(): Invalid Frappe form object provided.");
			return {};
		}

		const fieldsInSection = [];
		const fieldsInSectionJSON = {};
		let collectFields = false;
		let sectionFound = false;

		frm.meta.fields.forEach(field => {
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
			console.warn(`Utils.getFieldsInSection(): Section with fieldname "${sectionFieldName}" not found.`);
		} else if (fieldsInSection.length === 0) {
			console.warn(`Utils.getFieldsInSection(): No fields found in section "${sectionFieldName}".`);
		}
		return { fields: fieldsInSection, json: fieldsInSectionJSON };
	}

	/**
	 * Retrieves all fields within a specified column from the current form.
	 *
	 * @param {Object} props - The configuration object.
	 * @param {string} props.columnFieldName - The fieldname of the target column.
	 * @returns {{fields: string[], json: Object}} An object containing:
	 *   - fields: An array of fieldnames present within the column.
	 *   - json: An object mapping each fieldname to its field definition.
	 *
	 * @example
	 * // Retrieve fields in a column named "my_column"
	 * const { fields, json } = Utils.getFieldsInColumn({ columnFieldName: "my_column" });
	 * console.log("Column Fields:", fields);
	 * console.log("Field Definitions:", json);
	 */
	const getFieldsInColumn = ({ columnFieldName } = {}) => {
		const frm = cur_frm;
		if (!frm?.meta?.fields) {
			console.warn("Utils.getFieldsInColumn(): Invalid Frappe form object provided.");
			return {};
		}

		const fieldsInColumn = [];
		const fieldsInColumnJSON = {};
		let collectFields = false;
		let columnFound = false;

		frm.meta.fields.forEach(field => {
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
			console.warn(`Utils.getFieldsInColumn(): Column with fieldname "${columnFieldName}" not found.`);
		} else if (fieldsInColumn.length === 0) {
			console.warn(`Utils.getFieldsInColumn(): No fields found in column "${columnFieldName}".`);
		}
		return { fields: fieldsInColumn, json: fieldsInColumnJSON };
	}

	/**
	 * Checks mandatory fields in the current form and marks them as required if empty.
	 *
	 * @param {Object} props - The configuration object.
	 * @param {string[]} props.fields - Array of field names to check.
	 * @returns {string[]|boolean} Returns an array of missing field names if any are empty; otherwise, returns true.
	 *
	 * @example
	 * // Check if the fields "first_name" and "last_name" are filled
	 * const result = Utils.checkMandatory({ fields: ["first_name", "last_name"] });
	 * if (result !== true) {
	 *   console.log("Missing mandatory fields:", result);
	 * }
	 */
	const checkMandatory = ({ fields = [] } = {}) => {
		const frm = cur_frm;
		if (!frm?.meta?.fields) {
			console.warn("Utils.checkMandatory(): Invalid Frappe form object provided.");
			return [];
		}
		const missingFields = [];
		fields.forEach(field => {
			if (frm.fields_dict[field]) {
				if (!frm.doc[field]) {
					frm.set_df_property(field, "reqd", 1);
					frm.refresh_field(field);
					missingFields.push(field);
				}
			} else {
				console.warn(`Utils.checkMandatory(): Field "${field}" does not exist in the form or cannot be marked mandatory.`);
			}
		});

		if (missingFields.length > 0) {
			frm.dirty()
		}

		return missingFields.length > 0 ? missingFields : true;
	}

	/**
	 * Changes the workflow state of the current form.
	 *
	 * @param {Object} props - The configuration object.
	 * @param {string} props.newState - The new workflow state to set.
	 * @param {string} [props.currentStateCheck] - Optional. Only change if the current workflow state matches this value.
	 *
	 * @example
	 * // Change the workflow state to "Approved" only if the current state is "Pending"
	 * Utils.changeWorkflowState({ newState: "Approved", currentStateCheck: "Pending" });
	 */
	const changeWorkflowState = ({ newState, currentStateCheck } = {}) => {
		const frm = cur_frm;
		if (!frm) {
			console.warn("Utils.changeWorkflowState(): Invalid Frappe form object provided.");
			return;
		}
		if (currentStateCheck && frm.doc.workflow_state !== currentStateCheck) {
			console.warn(`Utils.changeWorkflowState(): Current state is not ${currentStateCheck}. State change aborted.`);
			return;
		}
		frm.set_value("workflow_state", newState);
		frm.refresh_field("workflow_state");
	}

	/**
	 * Sets the read_only property on specified fields based on conditions and permissions.
	 *
	 * This function will skip updating fields that are already readonly if the preserveReadonly flag is set to true.
	 *
	 * @param {Object} props - The configuration object.
	 * @param {string[]} props.fields - An array of field names to update.
	 * @param {string[]} [props.permissions=[]] - Array of roles; if the current user has any of these roles, read_only settings are skipped.
	 * @param {string[]} [props.exceptionStates=[]] - Array of workflow states during which fields remain editable.
	 * @param {boolean} [props.preserveReadonly=false] - If true, fields that are already readonly will be preserved.
	 * @param {boolean} [props.debug=false] - Enable debug logging.
	 *
	 * @example
	 * // Set fields "first_name" and "last_name" as readonly, but preserve those already readonly.
	 * Utils.makeReadOnly({
	 *   fields: ["first_name", "last_name"],
	 *   preserveReadonly: true,
	 *   debug: true
	 * });
	 */
	const makeReadOnly = ({
		fields = [],
		permissions = [],
		exceptionStates = [],
		preserveReadonly = false,
		debug = false
	} = {}) => {
		const frm = cur_frm;
		if (!frm || !frm.doc || !frm.fields_dict) {
			if (debug) console.warn("Utils.makeReadOnly(): Invalid Frappe form object provided.");
			return [];
		}

		// Skip updating if user has a bypass role.
		if (Array.isArray(permissions) && userHasRole(permissions)) {
			if (debug) console.debug("Utils.makeReadOnly(): User has bypass role, skipping read-only settings.");
			return;
		}

		if (!Array.isArray(fields)) {
			if (debug) console.warn("Utils.makeReadOnly(): 'fields' must be an array.");
			return [];
		}

		const isExceptionState = exceptionStates.includes(cur_frm.doc.workflow_state);

		fields.forEach(field => {
			if (frm.fields_dict[field]) {
				// If preserveReadonly is enabled and the field is already readonly, skip updating it.
				if (
					preserveReadonly &&
					frm.fields_dict[field].df &&
					frm.fields_dict[field].df.read_only
				) {
					if (debug) console.debug(`Utils.makeReadOnly(): Preserving field "${field}" as readonly.`);
					return;
				}
				console.log(`Setting ${field} to read_only: ${isExceptionState ? 0 : 1}`);
				frm.set_df_property(field, "read_only", isExceptionState ? 0 : 1);
				frm.refresh_field(field);
			} else if (debug) {
				console.warn(`Utils.makeReadOnly(): Field "${field}" does not exist in the form or cannot be set to read_only.`);
			}
		});
	}

	/**
	 * Hides or shows specified fields in the current form based on the workflow state.
	 *
	 * @param {Object} props - The configuration object.
	 * @param {string[]} props.fields - Array of field names to hide.
	 * @param {string[]} [props.exceptionStates=[]] - Array of workflow states during which the fields remain visible.
	 *
	 * @example
	 * // Hide fields "phone" and "email" unless the workflow state is "Draft"
	 * Utils.hideFields({ fields: ["phone", "email"], exceptionStates: ["Draft"] });
	 */
	const hideFields = ({ fields = [], exceptionStates = [] } = {}) => {
		const frm = cur_frm;
		if (!frm?.doc || !frm.fields_dict) {
			console.warn("Utils.hideFields(): Invalid Frappe form object provided.");
			return [];
		}
		const isExceptionState = exceptionStates.includes(frm.doc.workflow_state);
		fields.forEach(field => {
			if (frm.fields_dict[field]) {
				frm.set_df_property(field, "hidden", isExceptionState ? 0 : 1);
				frm.refresh_field(field);
			} else {
				console.warn(`Utils.hideFields(): Field "${field}" does not exist in the form or cannot be hidden.`);
			}
		});
	}

	/**
	 * Navigates to a specified tab in the current form and scrolls to its first valid field.
	 *
	 * This function utilizes the refactored getFieldsInTab API, which expects a props object with:
	 *   - tab {string}: The fieldname of the target tab.
	 *
	 * @param {Object} props - The configuration object.
	 * @param {string} props.tab - The fieldname of the target tab.
	 *
	 * @example
	 * // Navigate to the tab with fieldname "details_tab"
	 * Utils.goToTab({ tab: "details_tab" });
	 */
	const goToTab = ({ tab } = {}) => {
		const frm = cur_frm;
		if (!frm?.meta?.fields) {
			console.warn("Utils.goToTab(): Invalid Frappe form object provided.");
			return;
		}
		// Use the refactored getFieldsInTab that accepts { tab }.
		const { fields, json } = getFieldsInTab({ tab });
		if (!fields || fields.length === 0) {
			console.warn(`Utils.goToTab(): Tab with fieldname "${tab}" not found or contains no valid fields.`);
			return;
		}
		const firstValidField = fields.find(fieldname => {
			const fieldMeta = json[fieldname];
			return fieldMeta && fieldMeta.fieldtype !== "Column Break" && fieldMeta.fieldtype !== "Section Break";
		});
		if (!firstValidField) {
			console.warn(`Utils.goToTab(): No scrollable fields found in tab "${tab}".`);
			return;
		}
		frm.scroll_to_field(firstValidField);
	};

	/**
	 * Navigates to the next tab in the current form.
	 *
	 * This function depends on the getTabs API to retrieve the list of tabs and then calls goToTab using the refactored props.
	 *
	 * @example
	 * // Navigate to the next tab
	 * goToTab.next();
	 */
	goToTab.next = () => {
		const { tabs } = getTabs({ excludeHidden: true });
		if (tabs.length === 0) {
			console.warn("Utils.goToTab.next(): No tabs found in the form.");
			return;
		}
		const activeTabLink = $("#form-tabs li a.active");
		if (!activeTabLink.length) {
			console.warn("Utils.goToTab.next(): No active tab found.");
			return;
		}
		const currentTab = activeTabLink.data("fieldname");
		const currentTabIndex = tabs.indexOf(currentTab);
		if (currentTabIndex === -1) {
			console.warn("Utils.goToTab.next(): Current tab not found in the list of tabs.");
			return;
		}
		const nextTabIndex = currentTabIndex + 1;
		if (nextTabIndex < tabs.length) {
			const nextTab = tabs[nextTabIndex];
			goToTab({ tab: nextTab });
		} else {
			console.warn("Utils.goToTab.next(): No next tab found. You are already on the last tab.");
		}
	};

	/**
	 * Navigates to the previous tab in the current form.
	 *
	 * This function depends on the getTabs API to retrieve the list of tabs and then calls goToTab using the refactored props.
	 *
	 * @example
	 * // Navigate to the previous tab
	 * goToTab.previous();
	 */
	goToTab.previous = () => {
		const { tabs } = getTabs({ excludeHidden: true });
		if (tabs.length === 0) {
			console.warn("Utils.goToTab.previous(): No tabs found in the form.");
			return;
		}
		const activeTabLink = $("#form-tabs li a.active");
		if (!activeTabLink.length) {
			console.warn("Utils.goToTab.previous(): No active tab found.");
			return;
		}
		const currentTab = activeTabLink.data("fieldname");
		const currentTabIndex = tabs.indexOf(currentTab);
		if (currentTabIndex === -1) {
			console.warn("Utils.goToTab.previous(): Current tab not found in the list of tabs.");
			return;
		}
		const previousTabIndex = currentTabIndex - 1;
		if (previousTabIndex >= 0) {
			const previousTab = tabs[previousTabIndex];
			goToTab({ tab: previousTab });
		} else {
			console.warn("Utils.goToTab.previous(): No previous tab found. You are already on the first tab.");
		}
	};


	/**
	 * Saves the current form and then executes the given callback.
	 * 
	 * @private
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
	 * Determines if the current tab has a next tab.
	 *
	 *
	 * @returns {{hasNext: boolean, nextTab: string|null}} An object containing:
	 *   - hasNext: True if a next tab exists.
	 *   - nextTab: The fieldname of the next tab, or null.
	 *
	 * @example
	 * const { hasNext, nextTab } = hasNextTab();
	 * if (hasNext) {
	 *   console.log("Next tab:", nextTab);
	 * }
	 */
	const hasNextTab = () => {
		const { tabs } = getTabs({ excludeHidden: true });
		if (tabs.length === 0) {
			console.warn("Utils.hasNextTab(): No tabs found in the form.");
			return { hasNext: false, nextTab: null };
		}
		const activeTabLink = $("#form-tabs li a.active");
		if (!activeTabLink.length) {
			console.warn("Utils.hasNextTab(): No active tab found.");
			return { hasNext: false, nextTab: null };
		}
		const currentTab = activeTabLink.data("fieldname");
		const currentTabIndex = tabs.indexOf(currentTab);
		if (currentTabIndex === -1) {
			console.warn("Utils.hasNextTab(): Current tab not found in the list of tabs.");
			return { hasNext: false, nextTab: null };
		}
		const nextTabIndex = currentTabIndex + 1;
		return {
			hasNext: nextTabIndex < tabs.length,
			nextTab: tabs[nextTabIndex] || null
		};
	}

	/**
	 * Determines if the current tab has a next tab
	 *
	 *
	 * @returns {{hasPrevious: boolean, previousTab: string|null}} An object containing:
	 *   - hasPrevious: True if a previous tab exists.
	 *   - previousTab: The fieldname of the previous tab, or null.
	 *
	 * @example
	 * const { hasPrevious, previousTab } = hasPreviousTab();
	 * if (hasPrevious) {
	 *   console.log("Previous tab:", previousTab);
	 * }
	 */
	const hasPreviousTab = () => {
		const { tabs } = getTabs({ excludeHidden: true });
		if (tabs.length === 0) {
			console.warn("Utils.hasPreviousTab(): No tabs found in the form.");
			return { hasPrevious: false, previousTab: null };
		}
		const activeTabLink = $("#form-tabs li a.active");
		if (!activeTabLink.length) {
			console.warn("Utils.hasPreviousTab(): No active tab found.");
			return { hasPrevious: false, previousTab: null };
		}
		const currentTab = activeTabLink.data("fieldname");
		const currentTabIndex = tabs.indexOf(currentTab);
		if (currentTabIndex === -1) {
			console.warn("Utils.hasPreviousTab(): Current tab not found in the list of tabs.");
			return { hasPrevious: false, previousTab: null };
		}
		const previousTabIndex = currentTabIndex - 1;
		return {
			hasPrevious: previousTabIndex >= 0,
			previousTab: tabs[previousTabIndex] || null
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
	 *       variant: 'destructive',
	 *       callback: function(frm, tab) {
	 *         console.log('Review & Save button clicked on tab ' + tab);
	 *       }
	 *     }
	 *   ]
	 * });
	 * 
	 * @example
	 * Example 5: // Add bootstrap or Custom classes to you buttons
	 * Utils.addTabButtons({ className: 'btn btn-info special-tab-button' });
	 */
	function addTabButtons(props) {
		props = props || {};

		const className = props.className || "";

		// Normalize buttons prop: if provided as a single object, wrap it in an array.
		if (props.buttons && !Array.isArray(props.buttons)) {
			props.buttons = [props.buttons];
		}
		// Mapping for variant to CSS class.
		const variantMapping = {
			primary: "btn-primary",
			secondary: "btn-secondary",
			destructive: "btn-danger",
			outline: "btn-outline",
			ghost: "btn-ghost"
		};

		const frm = cur_frm;
		const tabsData = Utils.getTabs(true);
		const tabs = tabsData.tabs;

		// Append navigation buttons to each .tab-pane.
		$(".tab-pane").each(function () {
			const tabId = $(this).attr("id");
			const tabFieldname = tabId.split("-").pop().replace("-tab", "");
			const currentTabIndex = tabs.indexOf(tabFieldname);

			// Build Previous button (left column) with className appended
			const previousButtonHTML =
				currentTabIndex > 0
					? `<button class="btn ${className} btn-primary float-left tab-navigation" data-direction="previous">Previous</button>`
					: `<button class="btn ${className} btn-primary float-left invisible" disabled>Previous</button>`;

			// Determine custom buttons for this tab.
			let customButtonsHTML = "";
			if (props.buttons && props.buttons.length) {
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
							return `<button class="btn ${className} ${variantClass} float-right custom-tab-button" data-tab="${tabFieldname}" data-cb-index="${index}">${label}</button>`;
						})
						.join(" ");
				}
			}

			// Decide what to render in the right column.
			const rightButtonHTML =
				customButtonsHTML !== ""
					? customButtonsHTML
					: currentTabIndex < tabs.length - 1
						? `<button class="btn btn-primary ${className} float-right tab-navigation" data-direction="next">Next</button>`
						: `<button class="btn btn-primary ${className} float-right invisible" disabled>Next</button>`;

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
	 * Retrieves and returns an array of allowed workflow action names for the current form.
	 *
	 * This function uses the getWorkflowTransitions() helper to obtain the list of transitions
	 * available from the current workflow state of the document and then maps these transitions
	 * to extract the action names.
	 *
	 * @returns {string[]} An array of allowed workflow action names.
	 *
	 * @example
	 * // Retrieve the allowed workflow actions:
	 * const actions = Utils.getActions();
	 * console.log(actions); // e.g. ["Approve", "Reject"]
	 */
	const getActions = () => {
		try {
			// Get transitions for the current state using the helper.
			const transitions = getWorkflowTransitions();
			// Map the transitions to their action names.
			return transitions.map(transition => transition.action);
		} catch (error) {
			console.warn("Error in getActions:", error);
			return [];
		}
	};


	/**
	 * Provides workflow action interception utilities for Frappe applications.
	 * 
	 * This object contains methods to intercept workflow actions with different behaviors:
	 * - confirm: Shows a confirmation dialog before allowing the action
	 */
	const action = {
		/**
		 * Intercepts a workflow action with a confirmation dialog.
		 * 
		 * @namespace Utils.action
		 * 
		 * @param {Object} props - Configuration options
		 * @param {string} props.action - The workflow action name to intercept
		 * @param {string} [props.message] - Custom confirmation message (defaults to "Are you sure you want to [action]?")
		 * @param {boolean} [props.debug] - Enable debug logging
		 * @param {Object} [props.updateField] - Field to update on confirmation
		 * @param {string} props.updateField.field - Field name to update
		 * @param {*} props.updateField.value - New value to set
		 * 
		 * @example
		 * // Intercept "Submit" action with confirmation dialog and update a counter
		 * Utils.action.confirm({
		 *   action: "Submit",
		 *   message: "Are you sure you want to submit this document?",
		 *   debug: true,
		 *   updateField: {
		 *     field: "revision_count",
		 *     value: cur_frm.doc.revision_count + 1
		 *   }
		 * });
		 */
		confirm: (props = {}) => {
			const { action, message, debug, updateField } = props;

			if (!action) {
				if (debug) {
					console.warn("Utils.action.confirm(): No action provided.");
				}
				return;
			}

			frappe.ui.form.on(cur_frm.doc.doctype, {
				before_workflow_action: async () => {
					if (cur_frm.selected_workflow_action !== action) return;
					if (debug) console.log(`Intercepting Workflow Action: ${action}`);
					frappe.dom.unfreeze();

					let promise = new Promise((resolve, reject) => {
						frappe.confirm(
							message || `Are you sure you want to ${action}?`,
							() => {
								if (updateField && updateField.field && updateField.value !== undefined) {
									frappe.db.set_value(cur_frm.doctype, cur_frm.docname, updateField.field, updateField.value)
										.then(response => {
											if (debug) {
												console.debug(`Field ${updateField.field} updated successfully`, response);
											}
											resolve();
										})
										.catch(error => {
											if (debug) {
												console.error(`Error updating field ${updateField.field}`, error);
											}
											reject();
										});
								} else {
									resolve();
								}
							},
							() => {
								if (debug) {
									console.debug(`Utils.action.confirm(): Cancelled action "${action}"`);
								}
								reject();
							}
						);


					});

					await promise.catch(() => {
						throw new Error("Workflow action cancelled.");
					});
				}
			});
		},
	};

	/**
	 * Get possible workflow transitions from the current state for the loaded document
	 * 
	 * @function
	 * 
	 * @returns {Array.<Object>} Array of transition objects. Each object has the following properties:
	 *   - action {string} The name of the workflow action.
	 *   - next_state {string} The state the workflow will transition to if the action is executed.
	 *   - allowed_roles {Array.<string>} Array of role names that are allowed to perform this action.
	 *   - condition {string} The condition (if any) associated with the transition.
	 *   - state {string} The current workflow state for which this transition is applicable.
	 *
	 * @example
	 * const transitions = Utils.getWorkflowTransitions();
	 * transitions.forEach(transition => {
	 *   console.log(`Action: ${transition.action}, Next State: ${transition.next_state}`);
	 * });
	 */
	function getWorkflowTransitions() {
		try {
			if (!cur_frm || !cur_frm.doc || !cur_frm.doc.doctype) {
				console.warn("Invalid form or missing DocType");
				return [];
			}

			const doctype = cur_frm.doc.doctype;
			const workflow_state = cur_frm.doc.workflow_state;

			if (!workflow_state) {
				console.warn(`No workflow state found for ${doctype}`);
				return [];
			}

			// Get transitions from the current form's workflow if available
			let transitions = [];

			// First check cur_frm.workflow (most reliable source)
			if (cur_frm.workflow && cur_frm.workflow.transitions) {
				transitions = cur_frm.workflow.transitions;
			}
			// Then check frappe.workflow.workflows
			else if (frappe.workflow && frappe.workflow.workflows && frappe.workflow.workflows[doctype]) {
				transitions = frappe.workflow.workflows[doctype].transitions || [];
			}

			if (transitions.length === 0) {
				console.warn(`No workflow transitions found for ${doctype}`);
				return [];
			}

			// Filter transitions for current state only
			const currentStateTransitions = transitions.filter(t => t.state === workflow_state);

			// Format the results with transition details and allowed roles
			return currentStateTransitions.map(transition => {
				return {
					action: transition.action || "",
					next_state: transition.next_state || "",
					allowed_roles: formatAllowedRoles(transition.allowed),
					condition: transition.condition || "",
					state: transition.state || ""
				};
			});
		} catch (error) {
			console.warn("Error in getWorkflowTransitions:", error);
			return [];
		}
	}

	/**
	 * Get all workflow transitions defined for a DocType
	 * 
	 * 
	 * @function
	 * @returns {Array.<Object>} Array of transition objects. Each object has the following properties:
	 *   - action {string} The name of the workflow action.
	 *   - next_state {string} The state that will be set when the action is executed.
	 *   - state {string} The workflow state from which the transition is available.
	 *   - allowed_roles {Array.<string>} Array of role names permitted to perform this transition.
	 *   - condition {string} A condition (if any) that must be met for the transition.
	 *
	 * @example
	 * const allTransitions = Utils.getAllWorkflowTransitions();
	 * allTransitions.forEach(transition => {
	 *   console.log(`Action: ${transition.action}, From State: ${transition.state}, To State: ${transition.next_state}`);
	 * });
	 */
	function getAllWorkflowTransitions() {
		try {
			if (!cur_frm || !cur_frm.doc || !cur_frm.doc.doctype) {
				console.warn("Invalid form or missing DocType");
				return [];
			}

			const doctype = cur_frm.doc.doctype;

			// Get transitions from the current form's workflow if available
			let transitions = [];

			// First check cur_frm.workflow (most reliable source)
			if (cur_frm.workflow && cur_frm.workflow.transitions) {
				transitions = cur_frm.workflow.transitions;
			}
			// Then check frappe.workflow.workflows
			else if (frappe.workflow && frappe.workflow.workflows && frappe.workflow.workflows[doctype]) {
				transitions = frappe.workflow.workflows[doctype].transitions || [];
			}

			if (transitions.length === 0) {
				console.warn(`No workflow transitions found for ${doctype}`);
				return [];
			}

			// Format the results with transition details and allowed roles
			return transitions.map(transition => {
				return {
					action: transition.action || "",
					next_state: transition.next_state || "",
					state: transition.state || "",
					allowed_roles: formatAllowedRoles(transition.allowed),
					condition: transition.condition || ""
				};
			});
		} catch (error) {
			console.warn("Error in getAllWorkflowTransitions:", error);
			return [];
		}
	}

	/**
	 * Provides site information.
	 * @namespace Utils.site
	 */
	const site = {
		/**
		 * Returns the list of installed apps with their versions.
		 *
		 * @returns {Array<Object>} Array of objects with app information (e.g., { name: "AppName", version: "1.2.3" }).
		 *
		 * @example
		 * const apps = Utils.instance.apps();
		 * console.log(apps); // e.g. [ { name: "ERPNext", version: "v13.0.1" }, ... ]
		 */
		apps: () => {
			if (typeof frappe !== 'undefined' && frappe.boot && frappe.boot.versions) {
				return frappe.boot.versions;
			}
			return [];
		}
	}

	// Expose public API methods.
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
		getAllWorkflowTransitions,
		getWorkflowTransitions,
		getActions: getActions,
		action: action,
		site: site
	};
})();