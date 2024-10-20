const researchConfig = {
	"Growth": [
		{
			"id": 1,
			"name": "Tooling Up",
			"level": 0,
			"maxLevel": 6,
			"prerequisites": []
		},
		{
			"id": 2,
			"name": "Ward Expansion",
			"level": 0,
			"maxLevel": 6,
			"prerequisites": [1]
		},
		{
			"id": 3,
			"name": "Camp Expansion",
			"level": 0,
			"maxLevel": 6,
			"prerequisites": [1]
		},
		{
			"id": 4,
			"name": "Tool Enhancement",
			"level": 0,
			"maxLevel": 6,
			"prerequisites": [2, 3]
		},
		{
			"id": 5,
			"name": "Bandaging",
			"level": 0,
			"maxLevel": 6,
			"prerequisites": [4]
		}
	],
	// Additional research trees like Economy and Battle will follow the same format
};

