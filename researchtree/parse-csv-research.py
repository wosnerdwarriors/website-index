#!/usr/bin/env python3
import copy
import csv
import json
import argparse
import sys
import re
from collections import defaultdict

def create_id(name):
	"""
	Creates an id by converting the name to lowercase, replacing spaces with dashes,
	and removing any trailing 'Lv.' or 'Lv. <number>'.
	"""
	# Remove trailing 'Lv.' or 'Lv. <number>' and strip spaces
	name = re.sub(r'\s*lv\.\s*\d*$', '', name, flags=re.IGNORECASE).strip()
	return name.lower().replace(" ", "-")

def parse_prerequisites(prereq_string):
	"""
	Parses the prerequisites string into buildings and research items and converts them to id format.
	"""
	building_prereqs = {}
	research_prereqs = {}
	
	prereq_lines = prereq_string.strip().split('\n')
	for line in prereq_lines:
		line = line.strip().rstrip(',')
		name, level = line.rsplit(' ', 1)
		level = int(level)
		item_id = create_id(name)
		if "research-center" in item_id:
			building_prereqs[item_id] = level
		else:
			research_prereqs[item_id] = level
	
	return building_prereqs, research_prereqs

def parse_buff(buff_string, row_num):
	"""
	Parses the buff string into stat-addition, stat, and troop-type.
	Handles both cases where troop types are mentioned and where they're not.
	"""
	stat_addition = None
	stat = None
	troop_type = None
	
	# Clean up the string: remove commas, plus signs, percentage signs
	buff_string_clean = buff_string.replace(",", "").replace("+", "").replace("%", "").strip()
	
	# Extract the first number for stat-addition
	numbers = re.findall(r"[-+]?\d*\.\d+|\d+", buff_string_clean)
	if len(numbers) != 1:
		print(f"Error parsing buff at row {row_num}: multiple or no numbers found in '{buff_string}'")
		raise ValueError(f"Multiple or no numbers found in buff: {buff_string}")
	
	stat_addition = float(numbers[0])
	remaining_text = buff_string_clean.replace(numbers[0], "").strip().lower()

	# Detect troop type and remove it from the stat string
	if "all troop" in remaining_text or "all troops" in remaining_text:
		troop_type = "all"
		remaining_text = re.sub(r"all troops?", "", remaining_text).strip()
	elif "infantry" in remaining_text:
		troop_type = "infantry"
		remaining_text = remaining_text.replace("infantry", "").strip()
	elif "marksman" in remaining_text:
		troop_type = "marksman"
		remaining_text = remaining_text.replace("marksman", "").strip()
	elif "lancer" in remaining_text:
		troop_type = "lancer"
		remaining_text = remaining_text.replace("lancer", "").strip()

	# If we stripped a troop type, the remaining text should be the stat (e.g., attack)
	if troop_type:
		stat = remaining_text.replace(" ", "-")
	else:
		# Otherwise, clean up numbers and remaining text for stats like "Troop Deployment Capacity"
		stat = re.sub(r"\d+", "", remaining_text).strip().replace(" ", "-")

	return stat_addition, stat, troop_type

def clean_self_referencing_prereqs(data):
	"""
	Removes any self-referencing prerequisites from the data.
	"""
	for item_id, item_data in data.items():
		for level, details in item_data["levels"].items():
			# Clean research-items
			details["requirements"]["research-items"] = {
				k: v for k, v in details["requirements"]["research-items"].items() if k != item_id
			}


def evaluate_rows(data, debug=False):
	"""
	Evaluate the rows based on prerequisites and place items on rows in the research tree.
	Ignores self-referencing prerequisites for row evaluation.
	"""
	rows = defaultdict(list)
	placed_items = set()
	unplaced_items = []

	# Create a deep copy of the data to remove self-referencing prerequisites
	data_copy = copy.deepcopy(data)

	# Remove self-referencing prerequisites from the copied data
	for item_id, item_data in data_copy.items():
		for level_data in item_data["levels"].values():
			level_data["requirements"]["research-items"] = {
				k: v for k, v in level_data["requirements"]["research-items"].items() if k != item_id
			}

	# Iteratively assign rows based on dependencies
	row_number = 1
	while True:
		placed_this_round = False

		if debug:
			print(f"\n--- Evaluating Row {row_number} ---")

		# Iterate through all items in the copied data
		for item_id, item_data in data_copy.items():
			if item_id in placed_items:
				if debug:
					print(f"Skipping {item_id} - Already placed in a row.")
				continue

			has_research_prereqs = False
			for level_data in item_data["levels"].values():
				if level_data["requirements"]["research-items"]:
					has_research_prereqs = True

			# Row 1: Place items with no research prerequisites in row 1
			if row_number == 1 and not has_research_prereqs:
				rows[1].append(item_id)
				placed_items.add(item_id)
				placed_this_round = True
				if debug:
					print(f"Placed {item_id} in Row 1 (no research prerequisites).")
				continue

			# For subsequent rows: Place items whose prerequisites are all in the previous row
			if row_number > 1:
				all_prereqs_in_prev_row = True
				prereq_list = []

				for level_data in item_data["levels"].values():
					for prereq in level_data["requirements"]["research-items"]:
						prereq_list.append(prereq)
						if prereq not in rows[row_number - 1]:
							all_prereqs_in_prev_row = False
							if debug:
								print(f"Prerequisite {prereq} for {item_id} not found in Row {row_number - 1}.")
							break  # No need to continue if one prereq isn't met

				if all_prereqs_in_prev_row:
					rows[row_number].append(item_id)
					placed_items.add(item_id)
					placed_this_round = True
					if debug:
						print(f"Placed {item_id} in Row {row_number} (all prerequisites: {prereq_list} met in Row {row_number - 1}).")
				else:
					if debug:
						print(f"{item_id} could not be placed in Row {row_number} (unmet prerequisites: {prereq_list}).")

		# If nothing was placed in this round, we are done
		if not placed_this_round:
			if debug:
				print(f"No items placed in Row {row_number}, stopping row evaluation.")
			break

		row_number += 1

	# Any remaining items that couldn't be placed
	for item_id in data.keys():
		if item_id not in placed_items:
			unplaced_items.append(item_id)
			if debug:
				print(f"{item_id} remains unplaced.")

	# Check if any rows have more than 3 items (error case)
	errors = []
	for row_number, row_items in rows.items():
		if len(row_items) > 3:
			errors.append(f"Row {row_number} has more than 3 items: {row_items}")

	if debug:
		# Output debug information
		for row_number, row_items in sorted(rows.items()):
			print(f"Row {row_number} #{len(row_items)}: {' '.join([f'({item})' for item in row_items])}")
		if unplaced_items:
			print(f"\nUnplaced items: {' '.join([f'({item})' for item in unplaced_items])}")
		if errors:
			print(f"\nErrors:\n" + "\n".join(errors))

	return rows, unplaced_items, errors


def parse_csv(input_csv, clean=False, debug=False, tree_type=None, output_json=None):
	with open(input_csv, newline='') as csvfile:
		reader = csv.reader(csvfile)
		data = {}
		current_name = None
		
		for row_num, row in enumerate(reader, start=1):
			# Skip header rows
			if row_num <= 2:
				continue

			try:
				# Extract the values from the row
				name = row[0] or current_name
				level = row[1]
				prereqs = row[2]
				meat_cost = row[3].replace(",", "")
				wood_cost = row[4].replace(",", "")
				coal_cost = row[5].replace(",", "")
				iron_cost = row[6].replace(",", "")
				steel_cost = row[7].replace(",", "")
				raw_time = row[8]  # Remove this line, since we don't need the raw time
				raw_time_seconds = row[9].replace(",", "")  # Already correct, keeping this

				power = row[10].replace(",", "")
				buff = row[11]
				
				# Update current_name if we have a new name
				if row[0]:
					current_name = row[0]
				
				# Create an ID from the name
				item_id = create_id(name)
				
				# Parse prerequisites
				building_prereqs, research_prereqs = parse_prerequisites(prereqs)
				
				# Parse buff (stat-addition, stat, troop-type)
				stat_addition, stat, troop_type = parse_buff(buff, row_num)
				
				# Construct the JSON structure
				if item_id not in data:
					data[item_id] = {
						"row": None,  # We will override this row later
						"name": name,
						"stat": stat,
						"troop-type": troop_type,
						"levels": {}
					}
				
				# Add data for each level
				data[item_id]["levels"][level] = {
					"stat-addition": stat_addition,
					"power": int(power),
					"cost": {
						"meat": int(meat_cost),
						"wood": int(wood_cost),
						"coal": int(coal_cost),
						"iron": int(iron_cost),
						"steel": int(steel_cost)
					},
					"research-time-seconds": int(raw_time_seconds),
					"requirements": {
						"research-items": research_prereqs,
						"buildings": building_prereqs
					}
				}

				# If debug is enabled, store the raw data as well for every field, right next to the parsed field
				if debug:
					data[item_id]["row-debug"] = row_num
					data[item_id]["name-debug"] = row[0]
					data[item_id]["stat-debug"] = buff
					data[item_id]["troop-type-debug"] = troop_type if troop_type else "null"
					
					level_data = data[item_id]["levels"][level]
					level_data["stat-addition-debug"] = buff
					level_data["power-debug"] = row[10]
					level_data["cost-debug"] = {
						"meat-debug": row[3],
						"wood-debug": row[4],
						"coal-debug": row[5],
						"iron-debug": row[6],
						"steel-debug": row[7]
					}
					level_data["research-time-seconds-debug"] = row[9]
					level_data["requirements-debug"] = {
						"research-items-debug": prereqs,
						"buildings-debug": prereqs
					}

			except Exception as e:
				print(f"Error processing row {row_num}: {row}")
				raise e
	
	# Clean self-referencing prerequisites if --clean is passed
	if clean:
		clean_self_referencing_prereqs(data)

	# Evaluate rows and determine placement for each research item
	rows, unplaced_items, errors = evaluate_rows(data, debug)

	# Assign the correct row numbers to each item
	for row_number, row_items in rows.items():
		for item_id in row_items:
			data[item_id]['row'] = row_number

	# Wrap in tree-type if --tree-type is set
	if tree_type:
		data = {tree_type: data}
	
	# Output JSON to file or stdout
	if output_json:
		with open(output_json, 'w') as outfile:
			json.dump(data, outfile, indent=4)
	else:
		print(json.dumps(data, indent=4))

	# Output debug info after JSON, if required
	if debug:
		print("\n--- Debug Information ---")
		for row_number, row_items in sorted(rows.items()):
			print(f"Row {row_number} #{len(row_items)}: {' '.join([f'({item})' for item in row_items])}")
		if unplaced_items:
			print(f"\nUnplaced items: {' '.join([f'({item})' for item in unplaced_items])}")
		if errors:
			print(f"\nErrors:\n" + "\n".join(errors))

if __name__ == "__main__":
	parser = argparse.ArgumentParser(description='Convert CSV to JSON for research data.')
	parser.add_argument('--input-csv', required=True, help='Input CSV file')
	parser.add_argument('--output-json', help='Output JSON file (optional, default to stdout)')
	parser.add_argument('--clean', action='store_true', help='Remove self-referencing prerequisites')
	parser.add_argument('--debug', action='store_true', help='Add debug information for parsed values')
	parser.add_argument('--tree-type', help='Optional prefix for the entire JSON output')
	args = parser.parse_args()
	
	parse_csv(args.input_csv, clean=args.clean, debug=args.debug, tree_type=args.tree_type, output_json=args.output_json)

