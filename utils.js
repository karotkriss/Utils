/**
 * Utils.js
 *
 * A collection of utility functions for Frappe forms.
 * This module simplifies form navigation, field management, workflow actions and transition definition, action interception and site information.,
 * automatically operating on the global cur_frm.
 *
 * @version 2.8.1
 *
 * @module Utils
 */
const Utils = (function () {
	/**
	 * A specialized extension of the Frappe Communication Composer.
	 * @class WorkflowCommunicationComposer
	 * @extends frappe.views.CommunicationComposer
	 */
	class WorkflowCommunicationComposer extends frappe.views
		.CommunicationComposer {
		/**
		 * @param {object} opts - The standard CommunicationComposer options, plus a custom callback.
		 * @param {function} opts.on_send_click - A callback function that is executed immediately
		 *   when the user clicks the "Send" button, *before* the email sending process begins.
		 */
		constructor(opts) {
			super(opts);
			this.on_send_click = opts.on_send_click;
			this.action_triggered = false;
		}

		/**
		 * Overrides the parent send_mail method.
		 * This override immediately executes the custom `on_send_click` callback and then
		 * proceeds to call the original `send_mail` method to send the email in the background.
		 * @override
		 */
		send_action() {
			if (this.on_send_click) {
				this.action_triggered = true;
				// Execute our custom logic immediately
				this.on_send_click();
			}

			// Now, call the original parent method to perform the actual email sending
			super.send_action();
		}
	}
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
			if (typeof allowed === "string") {
				return allowed
					.split(",")
					.map((role) => role.trim())
					.filter(Boolean);
			}

			// Handle array format
			if (Array.isArray(allowed)) {
				return allowed
					.map((role) =>
						typeof role === "string" ? role.trim() : String(role)
					)
					.filter(Boolean);
			}

			// Handle object format
			if (typeof allowed === "object") {
				return Object.keys(allowed).filter(Boolean);
			}

			return [];
		} catch (error) {
			console.warn("Error formatting allowed roles:", error);
			return [];
		}
	}

	/**
	 * Converts an input string to camelCase format.
	 *
	 * @private
	 * @param {string} input - The input string to be converted (e.g., "Submit Application").
	 * @returns {string} The camelCase string.
	 *
	 * @example
	 * const result = toCamelCase("Submit Application");
	 * console.log(result); // "submitApplication"
	 */
	const toCamelCase = (input) => {
		const words = input.split(" ").filter(Boolean);

		const camelCase = words
			.map((word, index) => {
				if (index === 0) return word.toLowerCase();
				return (
					word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
				);
			})
			.join("");

		return camelCase;
	};

	/**
	 * Generates a simple, random alphanumeric string of a fixed length.
	 *
	 * @private
	 *
	 * @param {number} [length=8] The desired length of the final string.
	 * @returns {string} The generated random string.
	 */
	function generateRandomString(length = 8) {
		let result = "";
		while (result.length < length) {
			// Append a random string (e.g., "76p79csx1") and continue until long enough
			result += Math.random().toString(36).substring(2);
		}
		// Truncate to the exact desired length
		return result.substring(0, length);
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
	 * @param {boolean} [props.debug=false] - Flag for enabling logging in non-production environments.
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
	const getTabs = (props = {}) => {
		const { excludeHidden = false, debug = false } = props;
		const frm = cur_frm;
		if (!frm?.meta?.fields) {
			if (debug && site.getEnvironment() === "development")
				console.warn(
					"Utils.getTabs(): Invalid Frappe form object provided."
				);
			return { tabs: [], json: {} };
		}

		const tabs = [];
		const tabsJSON = {};

		frm.meta.fields.forEach((field, index) => {
			if (field.fieldtype === "Tab Break") {
				if (excludeHidden && field.hidden) return;
				if (excludeHidden) {
					const next_field = frm.meta.fields[index + 1];
					if (!next_field || next_field.fieldtype == 'Tab Break') {
						// this tab is empty, so we skip it
						return;
					}
				}
				if (field.depends_on) {
					let expr = field.depends_on.trim();
					if (expr.startsWith("eval:")) expr = expr.substring(5);
					try {
						// Replace "doc." with "frm.doc." to properly reference the form document.
						if (/\bdoc\./.test(expr)) {
							expr = expr.replace(/\bdoc\./g, "frm.doc.");
						}
						if (!eval(expr)) {
							if (
								debug &&
								site.getEnvironment() === "development"
							)
								console.warn(
									`Utils.getTabs(): Tab "${field.label}" dependency check failed. Expression: ${field.depends_on}`
								);
							return;
						}
					} catch (error) {
						if (debug && site.getEnvironment() === "development")
							console.warn(
								`Utils.getTabs(): Error evaluating dependency for tab "${field.label}": ${error.message}`
							);
						return;
					}
				}
				tabs.push(field.fieldname);
				tabsJSON[field.fieldname] = field;
			}
		});

		if (tabs.length === 0) {
			if (debug && site.getEnvironment() === "development")
				console.warn("Utils.getTabs(): No tabs found in the form.");
		}
		return { tabs, json: tabsJSON };
	};

	/**
	 * Retrieves all fields within a specified tab from the current form.
	 *
	 * @param {Object} [props={}] - The configuration object.
	 * @param {string} props.tab - The fieldname of the target tab break field.
	 * @param {boolean} [props.debug=false] - Flag for enabling logging in non-production environments.
	 * @returns {{fields: string[], json: Object}} An object containing:
	 *   - fields: An array of fieldnames present within the tab.
	 *   - json: An object mapping each fieldname to its field definition. Returns { fields: [], json: {} } if tab not found or form is invalid.
	 *
	 * @example
	 * // Retrieve fields in a tab named "my_tab"
	 * const { fields, json } = Utils.getFieldsInTab({ tab: "my_tab" });
	 * console.log("Fields in tab:", fields);
	 * console.log("Field definitions:", json);
	 */
	const getFieldsInTab = (props = {}) => {
		const { tab, debug = false } = props;
		const frm = window.cur_frm;

		// Initial check for valid form and fields metadata
		if (!frm?.meta?.fields) {
			if (debug && site.getEnvironment() === "development") {
				console.warn(
					"Utils.getFieldsInTab(): Invalid Frappe form object provided."
				);
			}
			return { fields: [], json: {} }; // Return default empty structure
		}

		const allFields = frm.meta.fields;

		// Find the index of the "Tab Break" field that marks the start of the target tab
		const tabStartIndex = allFields.findIndex(
			(field) =>
				field.fieldtype === "Tab Break" && field.fieldname === tab
		);

		// If the target tab wasn't found, log a warning (if debugging) and return empty
		if (tabStartIndex === -1) {
			if (debug && site.getEnvironment() === "development") {
				console.warn(
					`Utils.getFieldsInTab(): Tab with fieldname "${tab}" not found.`
				);
			}
			return { fields: [], json: {} };
		}

		// Find the index of the *next* "Tab Break" after the starting one.
		// This marks the end of the current tab's content.
		const tabEndIndex = allFields.findIndex(
			(field, index) =>
				index > tabStartIndex && field.fieldtype === "Tab Break"
		);

		// Slice the array to get only the fields physically located between the start tab break
		// and the next tab break (or the end of the fields array if it's the last tab).
		// We slice *after* the starting tab break field (tabStartIndex + 1).
		const fieldsInSection = allFields.slice(
			tabStartIndex + 1,
			// If tabEndIndex is -1, it means no more Tab Breaks were found, so slice to the end.
			tabEndIndex === -1 ? undefined : tabEndIndex
		);

		// Use reduce to efficiently build the fields array and the json map in one pass
		const result = fieldsInSection.reduce(
			(accumulator, field) => {
				// Since we sliced correctly, we assume fields here belong to the tab.
				// The original function didn't explicitly filter out Sections/Columns *within* a tab,
				// so we maintain that behavior unless specified otherwise.
				accumulator.fields.push(field.fieldname);
				accumulator.json[field.fieldname] = field;
				return accumulator;
			},
			{ fields: [], json: {} }
		);

		// Log a warning if the tab was found but contained no fields
		if (
			debug &&
			site.getEnvironment() === "development" &&
			result.fields.length === 0
		) {
			console.warn(
				`Utils.getFieldsInTab(): No fields found within tab "${tab}".`
			);
		}

		return result;
	};

	/**
	 * Retrieves all fields within a specified section from the current form.
	 *
	 * @param {Object} [props] - The configuration object.
	 * @param {string} [props.section] - The fieldname of the target section.
	 * @param {boolean} [props.debug=false] - Flag for enabling logging in non-production environments.
	 * @returns {{fields: string[], json: Object}} An object containing:
	 *   - fields: An array of fieldnames present within the section.
	 *   - json: An object mapping each fieldname to its field definition.
	 *
	 * @example
	 * // Retrieve fields in a section named "my_section"
	 * const { fields, json } = Utils.getFieldsInSection({ section: "my_section" });
	 * console.log("Section Fields:", fields);
	 * console.log("Field Definitions:", json);
	 */
	const getFieldsInSection = (props = {}) => {
		const { section, debug } = props;

		const frm = cur_frm;
		if (!frm?.meta?.fields) {
			if (debug && site.getEnvironment() === "development")
				console.warn(
					"Utils.getFieldsInSection(): Invalid Frappe form object provided."
				);
			return {};
		}

		const fieldsInSection = [];
		const fieldsInSectionJSON = {};
		let collectFields = false;
		let sectionFound = false;

		frm.meta.fields.forEach((field) => {
			if (field.fieldtype === "Section Break") {
				if (field.fieldname === section) {
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
			if (debug && site.getEnvironment() === "development")
				console.warn(
					`Utils.getFieldsInSection(): Section with fieldname "${section}" not found.`
				);
		} else if (fieldsInSection.length === 0) {
			if (debug && site.getEnvironment() === "development")
				console.warn(
					`Utils.getFieldsInSection(): No fields found in section "${section}".`
				);
		}
		return { fields: fieldsInSection, json: fieldsInSectionJSON };
	};

	/**
	 * Retrieves all fields within a specified column from the current form.
	 *
	 * @param {Object} props - The configuration object.
	 * @param {string} props.column - The fieldname of the target column.
	 * @param {boolean} [props.debug=false] - Flag for enabling logging in non-production environments.
	 * @returns {{fields: string[], json: Object}} An object containing:
	 *   - fields: An array of fieldnames present within the column.
	 *   - json: An object mapping each fieldname to its field definition.
	 *
	 * @example
	 * // Retrieve fields in a column named "my_column"
	 * const { fields, json } = Utils.getFieldsInColumn({ column: "my_column" });
	 * console.log("Column Fields:", fields);
	 * console.log("Field Definitions:", json);
	 */
	const getFieldsInColumn = (props = {}) => {
		const { column, debug } = props;

		const frm = cur_frm;
		if (!frm?.meta?.fields) {
			if (debug && site.getEnvironment() === "development")
				console.warn(
					"Utils.getFieldsInColumn(): Invalid Frappe form object provided."
				);
			return {};
		}

		const fieldsInColumn = [];
		const fieldsInColumnJSON = {};
		let collectFields = false;
		let columnFound = false;

		frm.meta.fields.forEach((field) => {
			if (field.fieldtype === "Column Break") {
				if (field.fieldname === column) {
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
			if (debug && site.getEnvironment() === "development")
				console.warn(
					`Utils.getFieldsInColumn(): Column with fieldname "${column}" not found.`
				);
		} else if (fieldsInColumn.length === 0) {
			if (debug && site.getEnvironment() === "development")
				console.warn(
					`Utils.getFieldsInColumn(): No fields found in column "${column}".`
				);
		}
		return { fields: fieldsInColumn, json: fieldsInColumnJSON };
	};

	/**
	 * Checks mandatory fields in the current form and marks them as required if empty.
	 *
	 * @param {Object} props - The configuration object.
	 * @param {string[]} props.fields - Array of field names to check.
	 * @param {boolean} [props.debug=false] - Flag for enabling logging in non-production environments.
	 * @returns {string[]|boolean} Returns an array of missing field names if any are empty; otherwise, returns true.
	 *
	 * @example
	 * // Check if the fields "first_name" and "last_name" are filled
	 * const result = Utils.checkMandatory({ fields: ["first_name", "last_name"] });
	 * if (result !== true) {
	 *   console.log("Missing mandatory fields:", result);
	 * }
	 */
	const checkMandatory = (props = {}) => {
		const { fields = [], debug } = props;

		const frm = cur_frm;
		if (!frm?.meta?.fields) {
			if (debug && site.getEnvironment() === "development")
				console.warn(
					"Utils.checkMandatory(): Invalid Frappe form object provided."
				);
			return [];
		}
		const missingFields = [];
		fields.forEach((field) => {
			if (frm.fields_dict[field]) {
				if (!frm.doc[field]) {
					frm.set_df_property(field, "reqd", 1);
					frm.refresh_field(field);
					missingFields.push(field);
				}
			} else {
				if (debug && site.getEnvironment() === "development")
					console.warn(
						`Utils.checkMandatory(): Field "${field}" does not exist in the form or cannot be marked mandatory.`
					);
			}
		});

		if (missingFields.length > 0) {
			frm.dirty();
		}

		return missingFields.length > 0 ? missingFields : true;
	};

	/**
	 * Changes the workflow state of the current form.
	 *
	 * @param {Object} props - The configuration object.
	 * @param {string} props.newState - The new workflow state to set.
	 * @param {string} [props.currentStateCheck] - Optional. Only change if the current workflow state matches this value.
	 * @param {boolean} [props.debug=false] - Flag for enabling logging in non-production environments.
	 *
	 * @example
	 * // Change the workflow state to "Approved" only if the current state is "Pending"
	 * Utils.changeWorkflowState({ newState: "Approved", currentStateCheck: "Pending" });
	 */
	const changeWorkflowState = (props = {}) => {
		const { newState, currentStateCheck, autoSave = true, debug } = props;
		const frm = cur_frm;
		if (!frm) {
			if (debug && site.getEnvironment() === "development")
				console.warn(
					"Utils.changeWorkflowState(): Invalid Frappe form object provided."
				);
			return;
		}
		if (currentStateCheck && frm.doc.workflow_state !== currentStateCheck) {
			if (debug && site.getEnvironment() === "development")
				console.warn(
					`Utils.changeWorkflowState(): Current state is not ${currentStateCheck}. State change aborted.`
				);
			return;
		}
		frm.set_value("workflow_state", newState);
		frm.refresh_field("workflow_state");

		if (autoSave) {
			frm.save();
		}
	};

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
	const makeReadOnly = (props = {}) => {
		const {
			fields = [],
			permissions = [],
			exceptionStates = [],
			preserveReadonly = false,
			debug = false,
		} = props;

		const frm = cur_frm;
		if (!frm || !frm.doc || !frm.fields_dict) {
			if (debug && site.getEnvironment() === "development")
				console.warn(
					"Utils.makeReadOnly(): Invalid Frappe form object provided."
				);
			return [];
		}

		// Skip updating if user has a bypass role.
		if (Array.isArray(permissions) && userHasRole(permissions)) {
			if (debug && site.getEnvironment() === "development")
				console.debug(
					"Utils.makeReadOnly(): User has bypass role, skipping read-only settings."
				);
			return;
		}

		if (!Array.isArray(fields)) {
			if (debug && site.getEnvironment() === "development")
				console.warn(
					"Utils.makeReadOnly(): 'fields' must be an array."
				);
			return [];
		}

		const isExceptionState = exceptionStates.includes(
			cur_frm.doc.workflow_state
		);

		fields.forEach((field) => {
			if (frm.fields_dict[field]) {
				// If preserveReadonly is enabled and the field is already readonly, skip updating it.
				if (
					preserveReadonly &&
					frm.fields_dict[field].df &&
					frm.fields_dict[field].df.read_only
				) {
					if (debug && site.getEnvironment() === "development")
						console.debug(
							`Utils.makeReadOnly(): Preserving field "${field}" as readonly.`
						);
					return;
				}
				if (debug && site.getEnvironment() === "development")
					console.log(
						`Setting ${field} to read_only: ${isExceptionState ? 0 : 1
						}`
					);
				frm.set_df_property(
					field,
					"read_only",
					isExceptionState ? 0 : 1
				);
				frm.refresh_field(field);
			} else if (debug && site.getEnvironment() === "development") {
				console.warn(
					`Utils.makeReadOnly(): Field "${field}" does not exist in the form or cannot be set to read_only.`
				);
			}
		});
	};

	/**
	 * Hides or shows specified fields in the current form based on the workflow state.
	 *
	 * @param {Object} props - The configuration object.
	 * @param {string[]} props.fields - Array of field names to hide.
	 * @param {string[]} [props.exceptionStates=[]] - Array of workflow states during which the fields remain visible.
	 * @param {function} props.conditional - If this is truthy the fields will be hidden.
	 *
	 * @example
	 * // Hide fields "phone" and "email" unless the workflow state is "Draft"
	 * Utils.hideFields({ fields: ["phone", "email"], exceptionStates: ["Draft"] });
	 */
	const hideFields = (props = {}) => {
		const { fields = [], exceptionStates = [], debug, conditional } = props;

		const frm = cur_frm;
		if (!frm?.doc || !frm.fields_dict) {
			if (debug && site.getEnvironment() === "development")
				console.warn(
					"Utils.hideFields(): Invalid Frappe form object provided."
				);
			return;
		}

		if (!Array.isArray(fields)) {
			if (debug && site.getEnvironment() === "development")
				console.warn("Utils.hideFields(): 'fields' must be an array.");
			return;
		}

		if (conditional !== undefined && typeof conditional !== "function") {
			if (debug && site.getEnvironment() === "development")
				console.warn(
					"Utils.hideFields(): 'conditional' must be a function."
				);
			return;
		}

		const isExceptionState = exceptionStates.includes(
			frm.doc.workflow_state
		);

		fields.forEach((field) => {
			if (frm.fields_dict[field]) {
				let condition = false;
				if (conditional(window.cur_frm)) {
					condition = true;
				}

				if (debug && site.getEnvironment() === "development")
					console.debug(
						`Setting ${field} to hidden: ${isExceptionState || !condition ? 0 : 1
						}`
					);
				frm.set_df_property(
					field,
					"hidden",
					isExceptionState || !condition ? 0 : 1
				);
				frm.refresh_field(field);
			} else {
				if (debug && site.getEnvironment() === "development")
					console.warn(
						`Utils.hideFields(): Field "${field}" does not exist in the form or cannot be hidden.`
					);
			}
		});
	};

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
	/**
	 * Navigates to a specified tab in the current form and scrolls to its first valid field.
	 *
	 * @param {object} [props] - The configuration object.
	 * @param {string} props.tab - The fieldname of the target tab.
	 * @param {function(object): void} [props.callback] - A callback function to execute after navigation. Receives a context object.
	 *
	 * @example
	 * // Navigate to the tab with fieldname "details_tab"
	 * Utils.goToTab({ tab: "details_tab" });
	 */
	const goToTab = (props = {}) => {
		const { tab, debug, callback, prevTab, nextTab } = props;

		const frm = cur_frm;
		if (!frm?.meta?.fields) {
			if (debug && site.getEnvironment() === "development")
				console.warn(
					"Utils.goToTab(): Invalid Frappe form object provided."
				);
			return;
		}
		// Use the refactored getFieldsInTab that accepts { tab }.
		const { fields, json } = getFieldsInTab({ tab });
		if (!fields || fields.length === 0) {
			if (debug && site.getEnvironment() === "development")
				console.warn(
					`Utils.goToTab(): Tab with fieldname "${tab}" not found or contains no valid fields.`
				);
			return;
		}
		const firstValidField = fields.find((fieldname) => {
			const fieldMeta = json[fieldname];
			return (
				fieldMeta &&
				fieldMeta.fieldtype !== "Column Break" &&
				fieldMeta.fieldtype !== "Section Break"
			);
		});
		if (!firstValidField) {
			if (debug && site.getEnvironment() === "development")
				console.warn(
					`Utils.goToTab(): No scrollable fields found in tab "${tab}".`
				);
			return;
		}
		frm.scroll_to_field(firstValidField);
		if (callback) {
			callback({ frm, prevTab, currentTab: tab, nextTab });
		}
	};

	/**
	 * Navigates to the next tab in the current form.
	 *
	 * @param {object} [props] - The configuration object.
	 * @param {boolean} [props.debug=false] - Flag for enabling logging in non-production environments.
	 * @param {function(object): void} [props.callback] - A callback function to execute after navigation.
	 *
	 * @example
	 * // Navigate to the next tab
	 * goToTab.next();
	 */
	goToTab.next = (props = {}) => {
		const { debug, callback } = props;

		const { tabs } = getTabs({ excludeHidden: true });
		if (tabs.length === 0) {
			if (debug && site.getEnvironment() === "development")
				console.warn(
					"Utils.goToTab.next(): No tabs found in the form."
				);
			return;
		}
		const activeTabLink = $("#form-tabs li .active");
		if (!activeTabLink.length) {
			if (debug && site.getEnvironment() === "development")
				console.warn("Utils.goToTab.next(): No active tab found.");
			return;
		}
		const currentTab = activeTabLink.data("fieldname");
		const currentTabIndex = tabs.indexOf(currentTab);
		if (currentTabIndex === -1) {
			if (debug && site.getEnvironment() === "development")
				console.warn(
					"Utils.goToTab.next(): Current tab not found in the list of tabs."
				);
			return;
		}
		const nextTabIndex = currentTabIndex + 1;
		if (nextTabIndex < tabs.length) {
			const nextTab = tabs[nextTabIndex];
			goToTab({ tab: nextTab, callback: callback, prevTab: currentTab, nextTab: tabs[nextTabIndex + 1] || null });
		} else {
			if (debug && site.getEnvironment() === "development")
				console.warn(
					"Utils.goToTab.next(): No next tab found. You are already on the last tab."
				);
		}
	};

	/**
	 * Navigates to the previous tab in the current form.
	 *
	 * @param {object} [props] - The configuration object.
	 * @param {boolean} [props.debug=false] - Flag for enabling logging in non-production environments.
	 * @param {function(object): void} [props.callback] - A callback function to execute after navigation.
	 *
	 * @example
	 * // Navigate to the previous tab
	 * goToTab.previous();
	 */
	goToTab.previous = (props = {}) => {
		const { debug, callback } = props;

		const { tabs } = getTabs({ excludeHidden: true });
		if (tabs.length === 0) {
			if (debug && site.getEnvironment() === "development")
				console.warn(
					"Utils.goToTab.previous(): No tabs found in the form."
				);
			return;
		}
		const activeTabLink = $("#form-tabs li .active");
		if (!activeTabLink.length) {
			if (debug && site.getEnvironment() === "development")
				console.warn("Utils.goToTab.previous(): No active tab found.");
			return;
		}
		const currentTab = activeTabLink.data("fieldname");
		const currentTabIndex = tabs.indexOf(currentTab);
		if (currentTabIndex === -1) {
			if (debug && site.getEnvironment() === "development")
				console.warn(
					"Utils.goToTab.previous(): Current tab not found in the list of tabs."
				);
			return;
		}
		const previousTabIndex = currentTabIndex - 1;
		if (previousTabIndex >= 0) {
			const previousTab = tabs[previousTabIndex];
			goToTab({ tab: previousTab, callback: callback, prevTab: tabs[previousTabIndex - 1] || null, nextTab: currentTab });
		} else {
			if (debug && site.getEnvironment() === "development")
				console.warn(
					"Utils.goToTab.previous(): No previous tab found. You are already on the first tab."
				);
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
					console.error(
						"Utils.saveCallback(): No valid callback provided."
					);
				}
			});
		} else {
			if (typeof tabFieldNameOrCallback === "function") {
				tabFieldNameOrCallback(frm);
			} else if (typeof callback === "function") {
				callback(frm, tabFieldNameOrCallback);
			} else {
				console.error(
					"Utils.saveCallback(): No valid callback provided."
				);
			}
		}
	}

	/**
	 * Saves the current form and navigates to the specified tab.
	 *
	 * @param {object} props - The configuration object.
	 * @param {string} props.tab - The fieldname of the target tab.
	 * @param {function(object): void} [props.callback] - A callback function to execute after navigation.
	 */
	goToTab.save = function (props) {
		saveCallback(props.tab, () => goToTab(props));
	};

	/**
	 * Saves the current form and navigates to the next tab.
	 * @param {object} [props] - The configuration object.
	 * @param {function(object): void} [props.callback] - A callback function to execute after navigation.
	 */
	goToTab.next.save = function (props) {
		saveCallback(() => goToTab.next(props));
	};

	/**
	 * Saves the current form and navigates to the previous tab.
	 * @param {object} [props] - The configuration object.
	 * @param {function(object): void} [props.callback] - A callback function to execute after navigation.
	 */
	goToTab.previous.save = function (props) {
		saveCallback(() => goToTab.previous(props));
	};

	/**
	 * Determines if the current tab has a next tab.
	 *
	 * @param {boolean} [props.debug=false] - Flag for enabling logging in non-production environments.
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
	const hasNextTab = (props = {}) => {
		const { debug } = props;

		const { tabs } = getTabs({ excludeHidden: true });
		if (tabs.length === 0) {
			if (debug && site.getEnvironment() === "development")
				console.warn("Utils.hasNextTab(): No tabs found in the form.");
			return { hasNext: false, nextTab: null };
		}
		const activeTabLink = $("#form-tabs li .active");
		if (!activeTabLink.length) {
			if (debug && site.getEnvironment() === "development")
				console.warn("Utils.hasNextTab(): No active tab found.");
			return { hasNext: false, nextTab: null };
		}
		const currentTab = activeTabLink.data("fieldname");
		const currentTabIndex = tabs.indexOf(currentTab);
		if (currentTabIndex === -1) {
			if (debug && site.getEnvironment() === "development")
				console.warn(
					"Utils.hasNextTab(): Current tab not found in the list of tabs."
				);
			return { hasNext: false, nextTab: null };
		}
		const nextTabIndex = currentTabIndex + 1;
		return {
			hasNext: nextTabIndex < tabs.length,
			nextTab: tabs[nextTabIndex] || null,
		};
	};

	/**
	 * Determines if the current tab has a next tab
	 *
	 * @param {boolean} [props.debug=false] - Flag for enabling logging in non-production environments.
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
	const hasPreviousTab = (props = {}) => {
		const { debug } = props;

		const { tabs } = getTabs({ excludeHidden: true });
		if (tabs.length === 0) {
			if (debug && site.getEnvironment() === "development")
				console.warn(
					"Utils.hasPreviousTab(): No tabs found in the form."
				);
			return { hasPrevious: false, previousTab: null };
		}
		const activeTabLink = $("#form-tabs li .active");
		if (!activeTabLink.length) {
			if (debug && site.getEnvironment() === "development")
				console.warn("Utils.hasPreviousTab(): No active tab found.");
			return { hasPrevious: false, previousTab: null };
		}
		const currentTab = activeTabLink.data("fieldname");
		const currentTabIndex = tabs.indexOf(currentTab);
		if (currentTabIndex === -1) {
			if (debug && site.getEnvironment() === "development")
				console.warn(
					"Utils.hasPreviousTab(): Current tab not found in the list of tabs."
				);
			return { hasPrevious: false, previousTab: null };
		}
		const previousTabIndex = currentTabIndex - 1;
		return {
			hasPrevious: previousTabIndex >= 0,
			previousTab: tabs[previousTabIndex] || null,
		};
	};

	        /**
	         * Adds navigation buttons (Previous, Next, and optionally custom buttons) to each tab-pane of the current form.
	         * The buttons are appended to each .tab-pane element.
	         *
	         * @param {object} [props] - Optional configuration object.
	         * @param {string[]} [props.saveTabs] - Array of tab fieldnames (or '*' for all) that are eligible for saving. Saving behavior is further controlled by `saveConfig` if provided.
	         * @param {object} [props.saveConfig] - Configuration for controlling save direction for tabs specified in `saveTabs`.
	         * @param {('forward'|'backward'|'bidirectional')} [props.saveConfig.direction='bidirectional'] - Specifies when to save: 'forward' (on next), 'backward' (on previous), or 'bidirectional' (on both).
	         * @param {string} [props.prevLabel="Previous"] - Custom label for the "Previous" button.
	         * @param {string} [props.nextLabel="Next"] - Custom label for the "Next" button.
	         * @param {function(object): boolean|void} [props.beforeNavigation] - Callback to execute before tab navigation. Receives an object with `{ frm, prevTab, currentTab, nextTab, continueNavigation }`. Return `false` to prevent navigation.
	         * @param {function(object): void} [props.onPrev] - Callback to override the default "Previous" button behavior. Receives an object with `{ frm, prevTab, currentTab, nextTab, continueNavigation }`.
	         * @param {function(object): void} [props.onNext] - Callback to override the default "Next" button behavior. Receives an object with `{ frm, prevTab, currentTab, nextTab, continueNavigation }`.
	         * @param {function(object): void} [props.afterNavigation] - Callback to execute after tab navigation is complete. Receives an object with `{ frm, prevTab, currentTab, nextTab }`.
	         * @param {object|object[]} [props.buttons] - Custom button configuration(s) to replace the Next button on specific tabs.
	         * @param {string} props.buttons.tab - The fieldname where the button should be rendered.
	         * @param {string[]} [props.buttons.workflowStates] - Allowed workflow states for the button to render.
	         * @param {string} [props.buttons.label="Submit"] - The label to display on the button.
	         * @param {string} [props.buttons.variant="Primary"] - One of "Primary", "Secondary", "Destructive", "Outline", or "Ghost".
	         * @param {function(object, string): void} [props.buttons.callback] - Callback to execute when the button is clicked.
	         * @param {function(object): boolean} [props.buttons.conditional] - A function that receives `cur_frm` and returns true if the button should be rendered.
	         * @param {string} [props.className] - Custom CSS class to add to all buttons.
	         *
	         * @returns {object} An object containing references to the created button elements.
	         *
	         * @example
	         * // Example 1: Default navigation.
	         * Utils.addTabButtons();
	         *
	         * @example
	         * // Example 2: Custom labels and save on all tabs.
	         * Utils.addTabButtons({
	         *   saveTabs: ['*'],
	         *   prevLabel: 'Back',
	         *   nextLabel: 'Continue'
	         * });
	         *
	         * @example
	         * // Example 3: Override default navigation and conditionally continue.
	         * Utils.addTabButtons({
	         *   onNext: ({ frm, currentTab, nextTab, continueNavigation }) => {
	         *     if (frm.doc.some_field) {
	         *       console.log(`Custom logic executed on tab ${currentTab}. Now continuing to ${nextTab}.`);
	         *       continueNavigation();
	         *     } else {
	         *       console.log('Custom logic executed. Navigation stopped.');
	         *     }
	         *   },
	         *   afterNavigation: ({ frm, prevTab, currentTab, nextTab }) => {
	         *     console.log(`Navigated from ${prevTab} to ${currentTab}`);
	         *   }
	         * });
	         *
	         * @example
	         * // Example 4: Custom button on a specific tab.
	         * Utils.addTabButtons({
	         *   buttons: {
	         *     tab: 'final_tab',
	         *     workflowStates: ['Processing'],
	         *     label: 'Submit Application',
	         *     conditional: (frm) => frm.doc.approved === true,
	         *     callback: (frm, tab) => {
	         *       console.log('Submit button clicked on tab ' + tab);
	         *     }
	         *   }
	         * });
	         *
	         * @example
	         * // Example 5: Advanced usage with validation, confirmation, and custom buttons.
	         * Utils.addTabButtons({
	         *   prevLabel: 'Back',
	         *   nextLabel: 'Next',
	         *   onPrev: ({ continueNavigation }) => {
	         *     frappe.confirm('Are you sure you want to go back?', continueNavigation);
	         *   },
	         *   onNext: ({ frm, currentTab, continueNavigation }) => {
	         *     if (currentTab === 'personal_info_tab') {
	         *       if (frm.doc.email_address && frm.doc.phone_number) {
	         *         continueNavigation();
	         *       } else {
	         *         frappe.msgprint('Please fill in both email and phone number before proceeding.');
	         *       }
	         *     } else {
	         *       continueNavigation();
	         *     }
	         *   },
	         *   afterNavigation: ({ frm, currentTab }) => {
	         *     if (currentTab === 'summary_tab') {
	         *       frm.refresh_field('summary_html_field');
	         *     }
	         *   },
	         *   buttons: {
	         *     tab: 'summary_tab',
	         *     label: 'Submit',
	         *     callback: (frm) => {
	         *       frm.save('submit');
	         *     }
	         *   }
	         * });
	         *
	         * @example
	         * // Example 6: Save only when navigating forward for tabs in `saveTabs`.
	         * Utils.addTabButtons({
	         *   saveTabs: ['personal_info_tab', 'contact_info_tab'],
	         *   saveConfig: { direction: 'forward' }
	         * });
	         *
	         * @example
	         * // Example 7: Prevent navigation based on a condition.
	         * Utils.addTabButtons({
	         *   beforeNavigation: ({ frm, currentTab }) => {
	         *     if (currentTab === 'personal_info_tab' && !frm.doc.is_agreed) {
	         *       frappe.msgprint('Please agree to the terms before leaving this tab.');
	         *       return false; // Prevent navigation
	         *     }
	         *     return true; // Allow navigation
	         *   }
	    	 */    function addTabButtons(props) {
		props = props || {};

		const className = props.className || "";
		const prevLabel = props.prevLabel || "Previous";
		const nextLabel = props.nextLabel || "Next";

		// Normalize buttons prop: if provided as a single object, wrap it in an array.
		if (props.buttons && !Array.isArray(props.buttons)) {
			props.buttons = [props.buttons];
		}
		// Mapping for variant to CSS class.
		const variantMapping = {
			primary: "btn-primary",
			secondary: "btn-secondary",
			destructive: "btn-danger",
			success: "btn-success",
			outline: "btn-outline",
			ghost: "btn-ghost",
		};

		const frm = cur_frm;
		const tabsData = Utils.getTabs({ excludeHidden: true });
		const tabs = tabsData.tabs;

		const $tab_nav = $("div.nav-buttons");
		if ($tab_nav.length > 0) {
			$tab_nav.remove();
		}
		// Append navigation buttons to each .tab-pane.
		const buttonRefs = {};

		$(".tab-pane").each(function () {
			const tabId = $(this).attr("id");
			const tabFieldname = tabId.split("-").pop().replace("-tab", "");
			const currentTabIndex = tabs.indexOf(tabFieldname);

			// Build Previous button (left column) with className appended
			const previousButtonHTML =
				currentTabIndex > 0
					? `<button class="btn ${className} btn-primary float-left tab-navigation" data-direction="previous">${prevLabel}</button>`
					: `<button class="btn ${className} btn-primary float-left invisible" disabled>${prevLabel}</button>`;

			// Determine custom buttons for this tab.
			let customButtonsHTML = "";
			if (props.buttons && props.buttons.length) {
				const filtered = props.buttons.filter(function (btn) {
					return (
						btn.tab === tabFieldname &&
						(!btn.workflowStates ||
							(Array.isArray(btn.workflowStates) &&
								btn.workflowStates.includes(
									frm.doc.workflow_state
								))) &&
						(typeof btn.conditional !== "function" ||
							!btn.conditional ||
							btn.conditional(frm))
					);
				});
				if (filtered.length) {
					customButtonsHTML = filtered
						.map(function (btn, index) {
							const label = btn.label || "Submit";
							const variantClass =
								btn.variant && variantMapping[btn.variant]
									? variantMapping[btn.variant]
									: "btn-primary";
							const disabledAttr = btn.disabled ? "disabled" : "";
							return `<button class="btn ${className} ${variantClass} float-right custom-tab-button" data-tab="${tabFieldname}" data-cb-index="${index}" data-label="${label}" ${disabledAttr}>${label}</button>`;
						})
						.join(" ");
				}
			}

			// Decide what to render in the right column.
			const rightButtonHTML =
				customButtonsHTML !== ""
					? customButtonsHTML
					: currentTabIndex < tabs.length - 1
						? `<button class="btn btn-primary ${className} float-right tab-navigation" data-direction="next">${nextLabel}</button>`
						: `<button class="btn btn-primary ${className} float-right invisible" disabled>${nextLabel}</button>`;

			const buttonHtml = `
		  <div class="flex form-section-buttons justify-between nav-buttons w-100" data-tab="${tabFieldname}">
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

			const $nav = $(this).find(
				`.nav-buttons[data-tab="${tabFieldname}"]`
			);
			const prevButton = $nav.find('button[data-direction="previous"]');
			const nextButton = $nav.find('button[data-direction="next"]');
			const customButtons = $nav.find("button.custom-tab-button");

			buttonRefs[tabFieldname] = {
				previous: prevButton,
				next: nextButton,
			};

			customButtons.each(function (index, elem) {
				const btnLabel = $(elem).data("label");
				buttonRefs[tabFieldname][btnLabel] = $(elem);
			});
		});

		// Event handler for navigation buttons (Previous/Next).
		$(document).off("click", ".tab-navigation");
		$(document).on("click", ".tab-navigation", function () {
			$(this).prop("disabled", true);
			setTimeout(() => {
				$(this).prop("disabled", false);
			}, 1000);
			const direction = $(this).data("direction");
			const currentTabFieldname = $("#form-tabs li .active").data(
				"fieldname"
			);
			const currentTabIndex = tabs.indexOf(currentTabFieldname);
			const prevTab = tabs[currentTabIndex - 1] || null;
			const nextTab = tabs[currentTabIndex + 1] || null;

			const continueNavigation = () => {
				const nav_props = { callback: props.afterNavigation };
				let shouldSave = false;

				const saveTabs = props.saveTabs || [];
				const isCurrentTabInSaveTabs = saveTabs.indexOf("*") !== -1 || saveTabs.indexOf(currentTabFieldname) !== -1;

				if (isCurrentTabInSaveTabs) { // Only consider saving if the current tab is in saveTabs
					if (props.saveConfig) {
						const { direction: saveDirection } = props.saveConfig;

						if (saveDirection === 'forward' && direction === 'next') {
							shouldSave = true;
						} else if (saveDirection === 'backward' && direction === 'previous') {
							shouldSave = true;
						} else if (saveDirection === 'bidirectional') {
							shouldSave = true;
						}
					} else { // If saveConfig is not provided, but saveTabs is, then save
						shouldSave = true;
					}
				}

				if (shouldSave) {
					if (direction === "previous") {
						Utils.goToTab.previous.save(nav_props);
					} else {
						Utils.goToTab.next.save(nav_props);
					}
				} else {
					if (direction === "previous") {
						Utils.goToTab.previous(nav_props);
					} else {
						Utils.goToTab.next(nav_props);
					}
				}
			};

			const context = {
				frm: frm,
				prevTab: prevTab,
				currentTab: currentTabFieldname,
				nextTab: nextTab,
				continueNavigation: continueNavigation
			};

			// New beforeNavigation logic
			if (typeof props.beforeNavigation === "function") {
				const shouldProceed = props.beforeNavigation(context);
				if (shouldProceed === false) {
					// If beforeNavigation explicitly returns false, stop the navigation
					return;
				}
			}

			if (direction === "next" && typeof props.onNext === "function") {
				props.onNext(context);
			} else if (direction === "previous" && typeof props.onPrev === "function") {
				props.onPrev(context);
			} else {
				continueNavigation();
			}
		});

		// Event handler for custom buttons.
		$(document).off("click", ".custom-tab-button");
		$(document).on("click", ".custom-tab-button", function () {
			$(this).prop("disabled", true);
			setTimeout(() => {
				$(this).prop("disabled", false);
			}, 1000);
			const tab = $(this).data("tab");
			const cbIndex = parseInt($(this).data("cb-index"), 10);
			const applicableButtons = (props.buttons || []).filter(function (
				btn
			) {
				return (
					btn.tab === tab &&
					(!btn.workflowStates ||
						(Array.isArray(btn.workflowStates) &&
							btn.workflowStates.indexOf(
								frm.doc.workflow_state
							) !== -1)) &&
					(typeof btn.conditional !== "function" ||
						btn.conditional(frm))
				);
			});
			const btnConfig = applicableButtons[cbIndex];
			if (btnConfig && typeof btnConfig.callback === "function") {
				btnConfig.callback(frm, tab);
			} else {
				if (props.debug && site.getEnvironment() === "development")
					console.log("Custom button clicked on tab " + tab);
			}
		});

		return buttonRefs;
	}

	/**
	 * Retrieves and returns an array of allowed workflow action names for the current form.
	 *
	 * @deprecated This method is deprecated in favor of {@link workflow.getActions} method.
	 *
	 * This function uses the getWorkflowTransitions() helper to obtain the list of transitions
	 * available from the current workflow state of the document and then maps these transitions
	 * to extract the action names.
	 *
	 * @param {boolean} [props.debug=false] - Flag for enabling logging in non-production environments.
	 *
	 * @returns {string[]} An array of allowed workflow action names.
	 *
	 * @example
	 * // Retrieve the allowed workflow actions:
	 * const actions = Utils.getActions();
	 * console.log(actions); // e.g. ["Approve", "Reject"]
	 */
	const getActions = (props = {}) => {
		const { debug } = props;

		if (debug && site.getEnvironment() === "development")
			console.warn(
				"This [getActions] method is deprecated and will be removed in version 2.0.0 Please use the [workflow.getActions] method instead. "
			);
		try {
			// Get transitions for the current state using the helper.
			const transitions = getWorkflowTransitions();
			// Map the transitions to their action names.
			return transitions.map((transition) => transition.action);
		} catch (error) {
			if (debug && site.getEnvironment() === "development")
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
				if (debug && site.getEnvironment() === "development") {
					console.warn("Utils.action.confirm(): No action provided.");
				}
				return;
			}

			if (frappe[`__${toCamelCase(action)}Confirm`]) return;
			frappe[`__${toCamelCase(action)}Confirm`] = true;

			frappe.ui.form.on(cur_frm.doc.doctype, {
				before_workflow_action: async () => {
					if (cur_frm.selected_workflow_action !== action) return;
					if (debug && site.getEnvironment() === "development")
						console.log(`Intercepting Workflow Action: ${action}`);
					frappe.dom.unfreeze();

					let promise = new Promise((resolve, reject) => {
						frappe.confirm(
							message || `Are you sure you want to ${action}?`,
							() => {
								if (
									updateField &&
									updateField.field &&
									updateField.value !== undefined
								) {
									frappe.db
										.set_value(
											cur_frm.doctype,
											cur_frm.docname,
											updateField.field,
											updateField.value
										)
										.then((response) => {
											if (
												debug &&
												site.getEnvironment() ===
												"development"
											) {
												console.debug(
													`Field ${updateField.field} updated successfully`,
													response
												);
											}
											resolve();
										})
										.catch((error) => {
											if (
												debug &&
												site.getEnvironment() ===
												"development"
											) {
												console.error(
													`Error updating field ${updateField.field}`,
													error
												);
											}
											reject();
										});
								} else {
									resolve();
								}
							},
							() => {
								if (
									debug &&
									site.getEnvironment() === "development"
								) {
									console.debug(
										`Utils.action.confirm(): Cancelled action "${action}"`
									);
								}
								reject();
							}
						);
					});

					await promise.catch(() => {
						throw new Error("Workflow action cancelled.");
					});
				},
			});
		},
		/**
		 * Intercepts a workflow action by opening an email composer. The workflow action
		 * and any field updates proceed after the user clicks "Send".
		 *
		 * @namespace Utils.action
		 *
		 * @param {Object} props - The configuration object.
		 * @param {string} props.action - The workflow action name to intercept (e.g., "Reject", "Request Info").
		 * @param {Object} [props.setValue] - An object of field-value pairs to set on the document before the workflow action proceeds.
		 * @param {Object} [props.composer_args={}] - An object of arguments to pass directly to the CommunicationComposer.
		 * @param {boolean} [props.debug=false] - Enable debug logging.
		 *
		 * @example
		 * // On "Reject", set a 'rejection_timestamp', then force the user to send an email.
		 * Utils.action.composeEmail({
		 *   action: "Reject",
		 *   debug: true,
		 *   setValue: {
		 *     rejection_timestamp: frappe.datetime.now_datetime()
		 *   },
		 *   composer_args: {
		 *     recipients: cur_frm.doc.owner,
		 *     subject: `Regarding your submission: ${cur_frm.doc.name}`,
		 *     message: "Hello,\n\nWe are unable to proceed with your submission for the following reason(s):\n\n"
		 *   }
		 * });
		 */
		composeEmail: (props = {}) => {
			const {
				action,
				composer_args = {},
				setValue,
				debug = false,
			} = props;
			const isDevelopment =
				debug && site?.getEnvironment() === "development";

			if (!action) {
				if (isDevelopment)
					console.warn(
						"Utils.action.composeEmail(): No action provided."
					);
				return;
			}

			const fieldsToUpdate =
				setValue &&
					typeof setValue === "object" &&
					Object.keys(setValue).length > 0
					? setValue
					: {};

			const uniqueActionFlag = `__${toCamelCase(action)}ComposeIntercept`;
			if (frappe[uniqueActionFlag]) return;
			frappe[uniqueActionFlag] = true;

			frappe.ui.form.on(cur_frm.doc.doctype, {
				before_workflow_action: async () => {
					if (cur_frm.selected_workflow_action !== action) return;

					if (isDevelopment)
						console.log(
							`Intercepting Workflow Action with Email Composer: ${action}`
						);
					frappe.dom.unfreeze();

					try {
						await new Promise((resolve, reject) => {
							const composer = new WorkflowCommunicationComposer({
								doc: cur_frm.doc,
								frm: cur_frm,
								...composer_args,
								on_send_click: resolve,
							});
							composer.dialog.onhide = () => {
								if (!composer.action_triggered) {
									reject(
										new Error(
											"Workflow action cancelled: Email composer was closed."
										)
									);
								}
							};
						});

						if (Object.keys(fieldsToUpdate).length > 0) {
							if (isDevelopment) {
								console.log(
									"Utils.action.composeEmail(): Updating fields before workflow action proceeds.",
									fieldsToUpdate
								);
							}

							const response = await frappe.call({
								method: "frappe.client.set_value",
								args: {
									doctype: cur_frm.doctype,
									name: cur_frm.docname,
									fieldname: fieldsToUpdate,
								},
							});

							if (response && response.message) {
								frappe.model.sync(response.message);
								cur_frm.refresh_fields(
									Object.keys(fieldsToUpdate)
								);
								if (isDevelopment) {
									console.log(
										"Utils.action.composeEmail(): Fields updated and form synced.",
										response.message
									);
								}
							}
						}
					} catch (error) {
						throw error;
					}
				},
			});
		},
		/**
		 * Intercepts a workflow action by opening a dialog to edit specified fields.
		 * The workflow action proceeds after the user submits the form with valid values.
		 *
		 * @namespace Utils.action
		 *
		 * @param {Object} props - The configuration object.
		 * @param {string} props.action - The workflow action name to intercept (e.g., "Approve", "Reject").
		 * @param {Array<Object>} props.fields - Array of field configurations to display in the dialog.
		 * @param {string} props.fields[].fieldname - The fieldname to edit.
		 * @param {number} [props.fields[].reqd=0] - Whether the field is required (1) or optional (0).
		 * @param {string} [props.title] - Custom dialog title (defaults to "Edit Fields - [action]").
		 * @param {string} [props.primary_action_label] - Label for the primary action button (defaults to the action name).
		 * @param {boolean} [props.debug=false] - Enable debug logging.
		 *
		 * @example
		 * // Intercept "Approve" action and require the user to fill in approval details
		 * Utils.action.editFields({
		 *   action: "Approve",
		 *   title: "Approval Details",
		 *   fields: [
		 *     { fieldname: "approved_by", reqd: 1 },
		 *     { fieldname: "approval_date", reqd: 1 },
		 *     { fieldname: "approval_notes", reqd: 0 }
		 *   ],
		 *   primary_action_label: "Approve & Save",
		 *   debug: true
		 * });
		 */
		editFields: (props = {}) => {
			const {
				action,
				fields = [],
				title,
				primary_action_label,
				debug = false,
			} = props;
			const isDevelopment =
				debug && site?.getEnvironment() === "development";

			if (isDevelopment) {
				console.group(`Utils.action.editFields(): Initializing for action "${action}"`);
				console.log("Configuration:", {
					action,
					fields: fields.map(f => f.fieldname || f),
					title: title || `Edit Fields - ${action}`,
					primary_action_label: primary_action_label || action,
					debug
				});
			}

			if (!action) {
				if (isDevelopment) {
					console.warn(
						"Utils.action.editFields(): No action provided."
					);
					console.groupEnd();
				}
				return;
			}

			if (!fields || !Array.isArray(fields) || fields.length === 0) {
				if (isDevelopment) {
					console.warn(
						"Utils.action.editFields(): No fields provided or invalid fields array."
					);
					console.groupEnd();
				}
				return;
			}

			const uniqueActionFlag = `__${toCamelCase(action)}EditFieldsIntercept`;
			if (frappe[uniqueActionFlag]) {
				if (isDevelopment) {
					console.log(`Intercept already registered for action "${action}"`);
					console.groupEnd();
				}
				return;
			}
			frappe[uniqueActionFlag] = true;

			if (isDevelopment) {
				console.log(`Registered intercept with flag: ${uniqueActionFlag}`);
				console.groupEnd();
			}

			frappe.ui.form.on(cur_frm.doc.doctype, {
				before_workflow_action: async () => {
					if (cur_frm.selected_workflow_action !== action) return;

					if (isDevelopment) {
						console.group(`Utils.action.editFields(): Intercepting Workflow Action "${action}"`);
						console.log("DocType:", cur_frm.doctype);
						console.log("Document:", cur_frm.docname);
						console.log("Current Workflow State:", cur_frm.doc.workflow_state);
					}
					frappe.dom.unfreeze();

					try {
						await new Promise((resolve, reject) => {
							// Track if the action was completed successfully
							let actionCompleted = false;

							// Build dialog fields from provided fieldnames
							const dialogFields = fields.map((fieldConfig) => {
								const { fieldname, reqd = 0 } = fieldConfig;

								// Get field metadata from the form
								const fieldMeta = cur_frm.fields_dict[fieldname];
								if (!fieldMeta) {
									if (isDevelopment)
										console.warn(
											`Utils.action.editFields(): Field "${fieldname}" not found in form.`
										);
									return null;
								}

								// Build dialog field definition from form field metadata
								const dialogField = {
									label: fieldMeta.df.label || fieldname,
									fieldname: fieldname,
									fieldtype: fieldMeta.df.fieldtype || "Data",
									reqd: reqd,
									default: cur_frm.doc[fieldname] ?? fieldMeta.df.default,
									options: fieldMeta.df.options,
									description: fieldMeta.df.description,
									read_only: 0, // Always allow editing in dialog
								};

								if (isDevelopment) {
									console.log(`Field "${fieldname}":`, {
										label: dialogField.label,
										fieldtype: dialogField.fieldtype,
										required: reqd ? "Yes" : "No",
										current_value: cur_frm.doc[fieldname],
										default_value: fieldMeta.df.default
									});
								}

								return dialogField;
							}).filter(Boolean); // Remove null entries

							if (dialogFields.length === 0) {
								if (isDevelopment) {
									console.warn(
										"Utils.action.editFields(): No valid fields to display."
									);
									console.groupEnd();
								}
								reject(
									new Error(
										"No valid fields to display in dialog."
									)
								);
								return;
							}

							if (isDevelopment) {
								console.log(`Total fields to display: ${dialogFields.length}`);
								console.log("Dialog configuration:", {
									title: title || `Edit Fields - ${action}`,
									size: "small",
									primary_action_label: primary_action_label || action,
									secondary_action_label: "Cancel"
								});
							}

							// Create and show the dialog
							const dialog = new frappe.ui.Dialog({
								title: title || `Edit Fields - ${action}`,
								fields: dialogFields,
								size: "small",
								primary_action_label: primary_action_label || action,
								secondary_action_label: "Cancel",
								primary_action: async (values) => {
									if (isDevelopment) {
										console.group("Utils.action.editFields(): Processing form submission");
										console.log("User submitted values:");
										Object.entries(values).forEach(([field, value]) => {
											console.log(`  - ${field}: ${JSON.stringify(value)}`);
										});
									}

									try {
										// Update all fields on the document
										const response = await frappe.call({
											method: "frappe.client.set_value",
											args: {
												doctype: cur_frm.doctype,
												name: cur_frm.docname,
												fieldname: values,
											},
										});

										if (response && response.message) {
											frappe.model.sync(response.message);
											cur_frm.refresh_fields(
												Object.keys(values)
											);
											if (isDevelopment) {
												console.log("Server response:", response.message);
												console.log(`Refreshed ${Object.keys(values).length} field(s)`);
												console.log("Fields updated and form synced successfully");
												console.groupEnd();
												console.groupEnd();
											}
										}

										actionCompleted = true;
										dialog.hide();
										resolve();
									} catch (error) {
										if (isDevelopment) {
											console.error(
												"Utils.action.editFields(): Error updating fields:",
												error
											);
											console.groupEnd();
											console.groupEnd();
										}
										frappe.msgprint({
											title: "Error",
											message: `Failed to update fields: ${error.message}`,
											indicator: "red",
										});
										reject(error);
									}
								},
								secondary_action: () => {
									if (isDevelopment) {
										console.log(
											`Utils.action.editFields(): User cancelled action "${action}"`
										);
										console.groupEnd();
									}
									dialog.hide();
									reject(
										new Error("Workflow action cancelled.")
									);
								},
							});

							// Handle dialog close (X button or ESC key)
							dialog.onhide = () => {
								if (!actionCompleted) {
									if (isDevelopment) {
										console.log(
											`Utils.action.editFields(): Dialog closed without completing action "${action}"`
										);
										console.groupEnd();
									}
									reject(new Error("Workflow action cancelled."));
								}
							};

							if (isDevelopment) {
								console.log("Dialog created and showing");
							}

							dialog.show();
						});
					} catch (error) {
						throw error;
					}
				},
			});
		},
	};

	/**
	 * Get possible workflow transitions from the current state for the loaded document
	 *
	 * @deprecated This method is deprecated in favor of {@link workflow.getTransitions} method.
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
		console.warn(
			"This [getWorkflowTransitions] method is deprecated and will be removed in version 2.0.0 Please use the [workflow.getTransitions] method instead. "
		);
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
			else if (
				frappe.workflow &&
				frappe.workflow.workflows &&
				frappe.workflow.workflows[doctype]
			) {
				transitions =
					frappe.workflow.workflows[doctype].transitions || [];
			}

			if (transitions.length === 0) {
				console.warn(`No workflow transitions found for ${doctype}`);
				return [];
			}

			// Filter transitions for current state only
			const currentStateTransitions = transitions.filter(
				(t) => t.state === workflow_state
			);

			// Format the results with transition details and allowed roles
			return currentStateTransitions.map((transition) => {
				return {
					action: transition.action || "",
					next_state: transition.next_state || "",
					allowed_roles: formatAllowedRoles(transition.allowed),
					condition: transition.condition || "",
					state: transition.state || "",
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
	 * @deprecated This method is deprecated in favor of {@link workflow.getAllTransitions} method.
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
		console.warn(
			"This [getAllWorkflowTransitions] method is deprecated and will be removed in version 2.0.0 Please use the [workflow.getAllTransitions] method instead. "
		);
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
			else if (
				frappe.workflow &&
				frappe.workflow.workflows &&
				frappe.workflow.workflows[doctype]
			) {
				transitions =
					frappe.workflow.workflows[doctype].transitions || [];
			}

			if (transitions.length === 0) {
				console.warn(`No workflow transitions found for ${doctype}`);
				return [];
			}

			// Format the results with transition details and allowed roles
			return transitions.map((transition) => {
				return {
					action: transition.action || "",
					next_state: transition.next_state || "",
					state: transition.state || "",
					allowed_roles: formatAllowedRoles(transition.allowed),
					condition: transition.condition || "",
				};
			});
		} catch (error) {
			console.warn("Error in getAllWorkflowTransitions:", error);
			return [];
		}
	}

	/**
	 * Provides workflow information for the current form.
	 *
	 * @namespace Utils.site
	 *
	 */
	const workflow = {
		/**
		 * Retrieves all allowed workflow action names for the current form.
		 * @returns {string[]} An array of allowed workflow action names.
		 *
		 * @example
		 * // Retrieve all available workflow actions and log them to the console
		 * const actions = Utils.workflow.getActions();
		 * console.log(actions);
		 *
		 * @example
		 * // Check if the "Approve" action is available
		 * if (Utils.workflow.getActions().includes("Approve")) {
		 *   console.log("Approval action available.");
		 * }
		 */
		getActions: () => {
			try {
				const transitions = workflow.getTransitions();
				return transitions.map(({ action }) => action);
			} catch (error) {
				console.warn("Error in workflow.getActions:", error);
				return [];
			}
		},

		/**
		 * Retrieves possible workflow transitions from the current state for the loaded document.
		 * @returns {Array.<Object>} Array of transition objects.
		 *
		 * @example
		 * // Retrieve all transitions from the current state and log them
		 * const transitions = Utils.workflow.getTransitions();
		 * transitions.forEach(({ action, next_state }) => console.log(`${action} -> ${next_state}`));
		 *
		 * @example
		 * // Check if a "Reject" action is available
		 * const hasRejectAction = Utils.workflow.getTransitions().some(({ action }) => action === "Reject");
		 * console.log(hasRejectAction ? "Rejection possible." : "No rejection available.");
		 */
		getTransitions: () => {
			try {
				if (!cur_frm?.doc?.doctype) {
					console.warn("Invalid form or missing DocType");
					return [];
				}
				const { doctype, workflow_state } = cur_frm.doc;
				if (!workflow_state) {
					console.warn(`No workflow state found for ${doctype}`);
					return [];
				}
				const transitions =
					cur_frm.workflow?.transitions ||
					frappe.workflow?.workflows?.[doctype]?.transitions ||
					[];
				return transitions
					.filter(({ state }) => state === workflow_state)
					.map(
						({
							action = "",
							next_state = "",
							allowed,
							condition = "",
							state = "",
						}) => ({
							action,
							next_state,
							allowed_roles: formatAllowedRoles(allowed),
							condition,
							state,
						})
					);
			} catch (error) {
				console.warn("Error in workflow.getTransitions:", error);
				return [];
			}
		},

		/**
		 * Retrieves all workflow transitions defined for a DocType.
		 * @returns {Array.<Object>} Array of transition objects.
		 *
		 * @example
		 * // Log all possible workflow transitions
		 * Utils.workflow.getAllTransitions().forEach(({ state, next_state, action }) =>
		 *   console.log(`${state} -> ${next_state} via ${action}`)
		 * );
		 *
		 * @example
		 * // Check if any transitions exist
		 * const transitions = Utils.workflow.getAllTransitions();
		 * console.log(transitions.length ? "Transitions available." : "No transitions found.");
		 */
		getAllTransitions: () => {
			try {
				if (!cur_frm?.doc?.doctype) {
					console.warn("Invalid form or missing DocType");
					return [];
				}
				const { doctype } = cur_frm.doc;
				const transitions =
					cur_frm.workflow?.transitions ||
					frappe.workflow?.workflows?.[doctype]?.transitions ||
					[];
				return transitions.map(
					({
						action = "",
						next_state = "",
						state = "",
						allowed,
						condition = "",
					}) => ({
						action,
						next_state,
						state,
						allowed_roles: formatAllowedRoles(allowed),
						condition,
					})
				);
			} catch (error) {
				console.warn("Error in workflow.getAllTransitions:", error);
				return [];
			}
		},

		/**
		 * Retrieves all possible future workflow transitions starting from the specified or current state.
		 *
		 * @param {Object} [props={}] - Configuration options.
		 * @param {string} [props.state] - Optional workflow state to use as the starting state. If not provided, the current state (cur_frm.doc.workflow_state) is used.
		 * @returns {Array.<Object>} Array of transition objects.
		 *
		 * @example
		 * // Log all possible future transitions from the current state:
		 * Utils.workflow.getFutureTransitions().forEach(({ state, next_state, action }) =>
		 *   console.log(`${state} -> ${next_state} via ${action}`)
		 * );
		 *
		 * @example
		 * // Log future transitions starting from "Draft":
		 * Utils.workflow.getFutureTransitions({ state: "Draft" }).forEach(({ state, next_state, action }) =>
		 *   console.log(`${state} -> ${next_state} via ${action}`)
		 * );
		 *
		 * @example
		 * // Check if "Approved" is a future workflow state:
		 * const isApprovalPossible = Utils.workflow.getFutureTransitions().some(({ next_state }) => next_state === "Approved");
		 * console.log(isApprovalPossible ? "Approval is in a future state." : "Approval not possible yet.");
		 */
		getFutureTransitions: ({ state } = {}) => {
			try {
				if (!cur_frm || !cur_frm.doc || !cur_frm.doc.doctype) {
					console.warn(
						"Utils.getFutureWorkflowTransitions(): Invalid form or missing DocType"
					);
					return [];
				}

				const doctype = cur_frm.doc.doctype;
				// Use the provided state or default to the current workflow state from the form.
				const currentState = state || cur_frm.doc.workflow_state;
				if (!currentState) {
					console.warn(`No workflow state found for ${doctype}`);
					return [];
				}

				// Retrieve all workflow transitions
				let transitions = [];
				if (cur_frm.workflow && cur_frm.workflow.transitions) {
					transitions = cur_frm.workflow.transitions;
				} else if (
					frappe.workflow &&
					frappe.workflow.workflows &&
					frappe.workflow.workflows[doctype]
				) {
					transitions =
						frappe.workflow.workflows[doctype].transitions || [];
				}
				if (transitions.length === 0) {
					console.warn(
						`No workflow transitions found for ${doctype}`
					);
					return [];
				}

				// Build a transition map
				const transitionMap = {};
				transitions.forEach((transition) => {
					if (!transitionMap[transition.state]) {
						transitionMap[transition.state] = [];
					}
					transitionMap[transition.state].push(transition);
				});

				// Recursive function to collect future transitions
				const futureTransitions = [];
				const collectTransitions = (state) => {
					if (!transitionMap[state]) return;
					transitionMap[state].forEach((transition) => {
						if (
							!futureTransitions.some(
								(t) =>
									t.action === transition.action &&
									t.state === transition.state
							)
						) {
							futureTransitions.push({
								action: transition.action || "",
								next_state: transition.next_state || "",
								state: transition.state || "",
								allowed_roles: formatAllowedRoles(
									transition.allowed
								),
								condition: transition.condition || "",
							});
							collectTransitions(transition.next_state);
						}
					});
				};

				collectTransitions(currentState);

				return futureTransitions;
			} catch (error) {
				console.warn("Error in getFutureWorkflowTransitions:", error);
				return [];
			}
		},
	};

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
		 * const apps = Utils.site.apps();
		 * console.log(apps); // e.g. [ { name: "ERPNext", version: "v13.0.1" }, ... ]
		 */
		apps: () => {
			if (
				typeof frappe !== "undefined" &&
				frappe.boot &&
				frappe.boot.versions
			) {
				return frappe.boot.versions;
			}
			return [];
		},
		/**
		 * Determines the current running environment.
		 *
		 * This function checks if Frappe's boot information is available to determine
		 * if the application is running in development mode (using the developer_mode flag).
		 * If that is not available, it falls back to checking the window's hostname for common
		 * development hosts such as "localhost" or "127.0.0.1". If neither method provides a
		 * definitive answer, it defaults to "production".
		 *
		 * @returns {string} Returns "development" if in a development environment, otherwise "production".
		 * @since 1.5.0
		 *
		 * @example
		 * // Logs the current environment ("development" or "production")
		 * console.log(`Current Environment: ${Utils.site.getEnvironment()}`);
		 */
		getEnvironment: () => {
			// If Frappe boot is available, use its developer_mode flag.
			if (
				typeof frappe !== "undefined" &&
				frappe.boot &&
				typeof frappe.boot.developer_mode !== "undefined"
			) {
				return frappe.boot.developer_mode
					? "development"
					: "production";
			}

			if (
				typeof window !== "undefined" &&
				window.location &&
				window.location.hostname
			) {
				const devHosts = ["localhost", "127.0.0.1"];
				return devHosts.includes(window.location.hostname)
					? "development"
					: "production";
			}

			return "production";
		},
	};

	/**
	 * A utility for observing field changes on Frappe Framework forms.
	 *
	 * It simplifies the process of watching multiple fields and executing a single callback,
	 * providing a clean and robust way to manage and remove these listeners.
	 *
	 * Key features include the ability to add multiple independent watchers to the same field
	 * and to remove watchers precisely by ID or broadly by field name.
	 *
	 * @namespace Utils.observer
	 */
	const observer = {
		/**
		 * Initializes one or more observers on form fields. When any of the specified
		 * fields change, the provided callback function is executed.
		 *
		 * @param {object} [props={}] - The configuration object for the watcher.
		 * @param {string[]} props.fields - An array of field names to watch (e.g., ['customer', 'item_code']).
		 * @param {function(any, object)} props.callback - The function to execute when a field changes.
		 * It receives the field's new value as the first argument and the `frm` object as the second.
		 * @param {boolean} [props.debug=false] - If true, enables detailed console logging for this operation.
		 *
		 * @returns {Object.<string, {unwatch: function(), id: string}> | null} An object where keys are the
		 * field names. Each value is an object containing a specific `unwatch()` method for that listener
		 * and the watcher's unique `id`. Returns `null` if setup fails (e.g., `cur_frm` not found).
		 *
		 * @example
		 * // Watch 'customer' and 'company' fields.
		 * const myWatchers = Utils.observer.watch({
		 *   fields: ['customer', 'company'],
		 *   callback: (value, frm) => {
		 *     console.log(`A field was updated! New value: ${value}`);
		 *     // Do something useful, like refresh a dependent field.
		 *     frm.refresh_field('custom_status_indicator');
		 *   },
		 *   debug: true
		 * });
		 *
		 * // To be used later for precise unwatching.
		 * const customerWatcherId = myWatchers.customer.id;
		 *
		 * // To stop watching the 'company' field from this specific watcher:
		 * myWatchers.company.unwatch();
		 */
		watch: (props = {}) => {
			const { fields, callback, debug = false } = props;

			const isDevelopment = site.getEnvironment() == "development";
			let { cur_frm: frm } = window;

			if (!frm) {
				if (debug && isDevelopment)
					console.warn("Utils.observer.watch: `cur_frm` not found.");
				return null;
			}
			if (!fields) {
				if (debug && isDevelopment)
					console.warn(
						"Utils.observer.watch: No `fields` property provided."
					);
				return null;
			}
			if (!Array.isArray(fields)) {
				if (debug && isDevelopment)
					console.warn(
						"Utils.observer.watch: `fields` property must be an <Array>."
					);
				return null;
			}
			if (typeof callback !== "function") {
				if (debug && isDevelopment)
					console.warn(
						"Utils.observer.watch: No valid `callback` property provided, `callback` must be a <function>."
					);
				return null;
			}

			const watchers = {};

			for (let field of fields) {
				if (!field || typeof field !== "string") {
					if (debug && isDevelopment)
						console.warn(
							`Utils.observer.watch: Field ${field} must be a <String>.`
						);
					continue;
				}
				if (!frm.fields_dict[field]) {
					console.warn(
						`Utils.observer.watch: Field '${field}' not found in form.`
					);
					continue;
				}

				let ID = generateRandomString(6);
				const flagName = `__observer_${field}_${ID}`;

				const handler = () => {
					if (!frm[flagName]) {
						return null;
					}
					callback(frm.doc[field], frm);
				};

				frappe.ui.form.on(frm.doctype, field, handler);
				frm[flagName] = true;

				if (debug && isDevelopment) {
					console.debug(
						`Utils.observer.watch: Successfully initialized observer for field '${field}' with ID '${ID}'.`
					);
				}

				watchers[field] = {
					unwatch: () => {
						frm[flagName] = false;
					},
					id: ID,
				};
			}

			return watchers;
		},

		/**
		 * Disables one or all observers on specified form fields.
		 * This method can operate in two modes:
		 * 1.  **Precise Mode:** If an `id` is provided, it disables only that specific watcher.
		 * 2.  **Broad Mode:** If no `id` is provided, it disables ALL active watchers on that field.
		 *
		 * @param {object} [props={}] - The configuration object for the unwatch operation.
		 * @param {string[]} props.fields - An array of field names to unwatch.
		 * @param {string} [props.id] - Optional. If provided, disables only the watcher with this specific ID.
		 * @param {boolean} [props.debug=false] - If true, enables detailed console logging for this operation.
		 * @returns {void}
		 *
		 * @example
		 * // ---- PRECISE UNWATCH (by ID) ----
		 * // Assuming 'customerWatcherId' was saved from a previous watch() call.
		 * Utils.observer.unwatch({
		 *   fields: ['customer'],
		 *   id: customerWatcherId,
		 *   debug: true
		 * });
		 *
		 * @example
		 * // ---- BROAD UNWATCH (all on field) ----
		 * // This will disable ALL watchers on the 'item_code' field, regardless of their ID.
		 * Utils.observer.unwatch({
		 *   fields: ['item_code'],
		 *   debug: true
		 * });
		 */
		unwatch: (props = {}) => {
			const { fields, id, debug = false } = props;

			const isDevelopment = site.getEnvironment() == "development";
			let { cur_frm: frm } = window;

			if (!frm) {
				if (debug && isDevelopment)
					console.warn(
						"Utils.observer.unwatch: `cur_frm` not found."
					);
				return;
			}
			if (!fields) {
				if (debug && isDevelopment)
					console.warn(
						"Utils.observer.unwatch: No `fields` property provided."
					);
				return;
			}
			if (!Array.isArray(fields)) {
				if (debug && isDevelopment)
					console.warn(
						"Utils.observer.unwatch: `fields` property must be an <Array>."
					);
				return;
			}

			for (let field of fields) {
				if (!field || typeof field !== "string") {
					if (debug && isDevelopment)
						console.warn(
							`Utils.observer.unwatch: Field ${field} must be a <String>.`
						);
					continue;
				}
				if (!frm.fields_dict[field]) {
					console.warn(
						`Utils.observer.unwatch: Field '${field}' not found in form.`
					);
					continue;
				}

				if (id) {
					// Precise Mode: Disable by ID
					const flagName = `__observer_${field}_${id}`;
					if (frm[flagName] !== undefined) {
						frm[flagName] = false;
						if (debug && isDevelopment) {
							console.debug(
								`Utils.observer.unwatch: Disabled specific watcher with ID '${id}' for field '${field}'.`
							);
						}
					} else {
						if (debug && isDevelopment) {
							console.warn(
								`Utils.observer.unwatch: No watcher with ID '${id}' found for field '${field}'.`
							);
						}
					}
				} else {
					// Broad Mode: Disable all for the field
					const observerFlags = Object.keys(frm).filter((key) =>
						key.startsWith(`__observer_${field}_`)
					);

					if (!observerFlags.length) {
						if (debug && isDevelopment) {
							console.warn(
								`Utils.observer.unwatch: No observers for '${field}' available.`
							);
						}
						continue;
					}

					observerFlags.forEach((observerFlag) => {
						frm[observerFlag] = false;
					});

					if (debug && isDevelopment) {
						console.debug(
							`Utils.observer.unwatch: Disabled all ${observerFlags.length} observers for field '${field}'.`
						);
					}
				}
			}
		},
	};
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
		action: action,
		workflow: workflow,
		site: site,
		observer: observer,
	};
})();

// compliance with frappe best practice
(() => {
	frappe.provide("frappe.utilsPlus");
	frappe.utilsPlus = Utils;
})();