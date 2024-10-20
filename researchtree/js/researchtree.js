document.addEventListener('DOMContentLoaded', function() {
	function renderResearchTree(treeName, containerId) {
		const container = document.getElementById(containerId);
		const treeData = researchConfig[treeName];

		treeData.forEach((researchItem) => {
			const div = document.createElement('div');
			div.className = 'col-12 mb-3';

			const isDisabled = researchItem.prerequisites.some(prereq => {
				const prereqItem = treeData.find(item => item.id === prereq);
				return prereqItem.level < 1;
			});

			div.innerHTML = `
				<div class="card">
					<div class="card-body">
						<h5 class="card-title">${researchItem.name}</h5>
						<p class="card-text">Level: ${researchItem.level}/${researchItem.maxLevel}</p>
						<button class="btn btn-primary upgrade-btn" ${isDisabled ? 'disabled' : ''} data-id="${researchItem.id}">
							Upgrade
						</button>
					</div>
				</div>
			`;

			container.appendChild(div);
		});
	}

	renderResearchTree('Growth', 'growthTree');
});

