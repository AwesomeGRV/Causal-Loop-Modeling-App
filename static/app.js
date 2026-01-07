let currentProblem = null;
let problems = [];
let network = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    loadProblems();
});

// Load all problems
async function loadProblems() {
    try {
        const response = await fetch('/api/problems');
        const data = await response.json();
        problems = data.problems;
        displayProblems();
    } catch (error) {
        console.error('Error loading problems:', error);
        showError('Failed to load problems');
    }
}

// Display problems list
function displayProblems() {
    const container = document.getElementById('problemsList');
    
    if (problems.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center py-8">No problems created yet. Click "New Problem" to get started.</p>';
        return;
    }
    
    container.innerHTML = problems.map(problem => `
        <div class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition cursor-pointer" onclick="viewProblem('${problem.id}')">
            <div class="flex justify-between items-start">
                <div>
                    <h3 class="font-semibold text-lg text-gray-800">${problem.title}</h3>
                    <p class="text-gray-600 mt-1">${problem.description}</p>
                    <div class="flex gap-4 mt-2 text-sm text-gray-500">
                        <span><i class="fas fa-search mr-1"></i>${problem.causes?.length || 0} causes</span>
                        <span><i class="fas fa-exclamation-triangle mr-1"></i>${problem.impacts?.length || 0} impacts</span>
                        <span><i class="fas fa-sync-alt mr-1"></i>${problem.feedback_loops?.length || 0} loops</span>
                        <span><i class="fas fa-tools mr-1"></i>${problem.remediations?.length || 0} remediations</span>
                    </div>
                </div>
                <div class="flex gap-2">
                    <button onclick="event.stopPropagation(); editProblem('${problem.id}')" class="text-blue-600 hover:text-blue-700">
                        <i class="fas fa-edit"></i>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// View problem details
async function viewProblem(problemId) {
    try {
        const response = await fetch(`/api/problems/${problemId}`);
        const problem = await response.json();
        currentProblem = problem;
        
        // Show sections
        document.getElementById('detailsSection').classList.remove('hidden');
        document.getElementById('diagramSection').classList.remove('hidden');
        
        // Display problem details
        document.getElementById('problemTitle').textContent = problem.title;
        displayCauses(problem.causes || []);
        displayImpacts(problem.impacts || []);
        displayLoops(problem.feedback_loops || []);
        displayRemediations(problem.remediations || []);
        
        // Create causal diagram
        createCausalDiagram(problem);
        
        // Scroll to details
        document.getElementById('detailsSection').scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
        console.error('Error loading problem:', error);
        showError('Failed to load problem details');
    }
}

// Display causes
function displayCauses(causes) {
    const container = document.getElementById('causesList');
    
    if (causes.length === 0) {
        container.innerHTML = '<p class="text-gray-500">No causes defined</p>';
        return;
    }
    
    container.innerHTML = causes.map(cause => `
        <div class="p-3 border rounded cause-${cause.type}">
            <div class="font-medium">${cause.description}</div>
            <div class="text-sm text-gray-600 mt-1">
                Type: <span class="capitalize">${cause.type}</span>
            </div>
        </div>
    `).join('');
}

// Display impacts
function displayImpacts(impacts) {
    const container = document.getElementById('impactsList');
    
    if (impacts.length === 0) {
        container.innerHTML = '<p class="text-gray-500">No impacts defined</p>';
        return;
    }
    
    container.innerHTML = impacts.map(impact => `
        <div class="p-3 border rounded impact-${impact.type}">
            <div class="font-medium">${impact.description}</div>
            <div class="text-sm text-gray-600 mt-1">
                Type: <span class="capitalize">${impact.type}</span>
            </div>
        </div>
    `).join('');
}

// Display feedback loops
function displayLoops(loops) {
    const container = document.getElementById('loopsList');
    
    if (loops.length === 0) {
        container.innerHTML = '<p class="text-gray-500">No feedback loops defined</p>';
        return;
    }
    
    container.innerHTML = loops.map(loop => `
        <div class="p-3 border rounded">
            <div class="font-medium">${loop.description}</div>
            <div class="flex gap-2 mt-2">
                <span class="loop-badge ${loop.type === 'reinforcing' ? 'reinforcing' : 'balancing'}">
                    ${loop.type === 'reinforcing' ? 'R' : 'B'}
                </span>
                <span class="text-sm text-gray-600">
                    ${loop.type === 'reinforcing' ? 'Reinforcing' : 'Balancing'}
                </span>
            </div>
            <div class="text-sm text-gray-600 mt-1">
                ${loop.relationships?.join(' → ') || ''}
            </div>
        </div>
    `).join('');
}

// Display remediations
function displayRemediations(remediations) {
    const container = document.getElementById('remediationsList');
    
    if (remediations.length === 0) {
        container.innerHTML = '<p class="text-gray-500">No remediations defined</p>';
        return;
    }
    
    container.innerHTML = remediations.map(remediation => `
        <div class="p-3 border rounded remediation-${remediation.type}">
            <div class="font-medium">${remediation.description}</div>
            <div class="text-sm text-gray-600 mt-1">
                Type: <span class="capitalize">${remediation.type.replace('_', ' ')}</span>
            </div>
            ${remediation.targets ? `<div class="text-sm text-gray-600">Targets: ${remediation.targets.join(', ')}</div>` : ''}
        </div>
    `).join('');
}

// Create causal diagram
function createCausalDiagram(problem) {
    const container = document.getElementById('causalDiagram');
    
    // Create nodes and edges from problem data
    const nodes = new vis.DataSet([
        { id: 'problem', label: problem.title, color: '#ef4444', shape: 'box' }
    ]);
    
    const edges = new vis.DataSet([]);
    
    // Add cause nodes
    (problem.causes || []).forEach((cause, index) => {
        nodes.add({
            id: `cause_${index}`,
            label: cause.description.substring(0, 30) + (cause.description.length > 30 ? '...' : ''),
            color: cause.type === 'primary' ? '#dc2626' : cause.type === 'secondary' ? '#f59e0b' : '#6b7280',
            shape: 'ellipse'
        });
        edges.add({
            from: `cause_${index}`,
            to: 'problem',
            arrows: 'to',
            color: { color: '#6b7280' }
        });
    });
    
    // Add impact nodes
    (problem.impacts || []).forEach((impact, index) => {
        nodes.add({
            id: `impact_${index}`,
            label: impact.description.substring(0, 30) + (impact.description.length > 30 ? '...' : ''),
            color: impact.type === 'technical' ? '#2563eb' : impact.type === 'business' ? '#059669' : '#7c3aed',
            shape: 'ellipse'
        });
        edges.add({
            from: 'problem',
            to: `impact_${index}`,
            arrows: 'to',
            color: { color: '#6b7280' }
        });
    });
    
    // Add feedback loop edges
    (problem.feedback_loops || []).forEach((loop, loopIndex) => {
        if (loop.relationships && loop.relationships.length > 1) {
            for (let i = 0; i < loop.relationships.length - 1; i++) {
                edges.add({
                    from: loop.relationships[i].replace(/\s+/g, '_'),
                    to: loop.relationships[i + 1].replace(/\s+/g, '_'),
                    arrows: 'to',
                    color: { color: loop.type === 'reinforcing' ? '#16a34a' : '#d97706' },
                    label: loop.type === 'reinforcing' ? 'R' : 'B'
                });
            }
        }
    });
    
    const data = { nodes, edges };
    const options = {
        layout: {
            hierarchical: {
                direction: 'LR',
                sortMethod: 'directed'
            }
        },
        physics: {
            enabled: false
        },
        interaction: {
            hover: true,
            tooltipDelay: 200
        }
    };
    
    network = new vis.Network(container, data, options);
}

// Modal functions
function openCreateModal() {
    currentProblem = null;
    document.getElementById('problemForm').reset();
    clearFormContainers();
    document.getElementById('problemModal').classList.remove('hidden');
}

function editProblem(problemId) {
    const problem = problems.find(p => p.id === problemId);
    if (!problem) return;
    
    currentProblem = problem;
    document.getElementById('problemTitleInput').value = problem.title;
    document.getElementById('problemDescriptionInput').value = problem.description;
    
    clearFormContainers();
    
    // Load existing data
    (problem.causes || []).forEach(cause => addCauseToForm(cause));
    (problem.impacts || []).forEach(impact => addImpactToForm(impact));
    (problem.feedback_loops || []).forEach(loop => addLoopToForm(loop));
    (problem.remediations || []).forEach(remediation => addRemediationToForm(remediation));
    
    document.getElementById('problemModal').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('problemModal').classList.add('hidden');
}

function clearFormContainers() {
    document.getElementById('causesContainer').innerHTML = '';
    document.getElementById('impactsContainer').innerHTML = '';
    document.getElementById('loopsContainer').innerHTML = '';
    document.getElementById('remediationsContainer').innerHTML = '';
}

// Add form elements
function addCause() {
    addCauseToForm({});
}

function addCauseToForm(cause = {}) {
    const container = document.getElementById('causesContainer');
    const div = document.createElement('div');
    div.className = 'flex gap-2 items-center';
    div.innerHTML = `
        <input type="text" placeholder="Cause description" value="${cause.description || ''}" 
               class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
        <select class="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="primary" ${cause.type === 'primary' ? 'selected' : ''}>Primary</option>
            <option value="secondary" ${cause.type === 'secondary' ? 'selected' : ''}>Secondary</option>
            <option value="latent" ${cause.type === 'latent' ? 'selected' : ''}>Latent</option>
        </select>
        <button type="button" onclick="this.parentElement.remove()" class="text-red-600 hover:text-red-700">
            <i class="fas fa-trash"></i>
        </button>
    `;
    container.appendChild(div);
}

function addImpact() {
    addImpactToForm({});
}

function addImpactToForm(impact = {}) {
    const container = document.getElementById('impactsContainer');
    const div = document.createElement('div');
    div.className = 'flex gap-2 items-center';
    div.innerHTML = `
        <input type="text" placeholder="Impact description" value="${impact.description || ''}" 
               class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
        <select class="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="technical" ${impact.type === 'technical' ? 'selected' : ''}>Technical</option>
            <option value="business" ${impact.type === 'business' ? 'selected' : ''}>Business</option>
            <option value="operational" ${impact.type === 'operational' ? 'selected' : ''}>Operational</option>
        </select>
        <button type="button" onclick="this.parentElement.remove()" class="text-red-600 hover:text-red-700">
            <i class="fas fa-trash"></i>
        </button>
    `;
    container.appendChild(div);
}

function addLoop() {
    addLoopToForm({});
}

function addLoopToForm(loop = {}) {
    const container = document.getElementById('loopsContainer');
    const div = document.createElement('div');
    div.className = 'border rounded p-3';
    div.innerHTML = `
        <div class="flex gap-2 items-start mb-2">
            <input type="text" placeholder="Loop description" value="${loop.description || ''}" 
                   class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
            <select class="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="reinforcing" ${loop.type === 'reinforcing' ? 'selected' : ''}>Reinforcing (R)</option>
                <option value="balancing" ${loop.type === 'balancing' ? 'selected' : ''}>Balancing (B)</option>
            </select>
            <button type="button" onclick="this.parentElement.parentElement.remove()" class="text-red-600 hover:text-red-700">
                <i class="fas fa-trash"></i>
            </button>
        </div>
        <input type="text" placeholder="Cause → Effect relationships (comma separated)" 
               value="${(loop.relationships || []).join(' → ')}" 
               class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
    `;
    container.appendChild(div);
}

function addRemediation() {
    addRemediationToForm({});
}

function addRemediationToForm(remediation = {}) {
    const container = document.getElementById('remediationsContainer');
    const div = document.createElement('div');
    div.className = 'flex gap-2 items-center';
    div.innerHTML = `
        <input type="text" placeholder="Remediation description" value="${remediation.description || ''}" 
               class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
        <select class="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="short_term" ${remediation.type === 'short_term' ? 'selected' : ''}>Short-term</option>
            <option value="long_term" ${remediation.type === 'long_term' ? 'selected' : ''}>Long-term</option>
            <option value="preventive" ${remediation.type === 'preventive' ? 'selected' : ''}>Preventive</option>
        </select>
        <button type="button" onclick="this.parentElement.remove()" class="text-red-600 hover:text-red-700">
            <i class="fas fa-trash"></i>
        </button>
    `;
    container.appendChild(div);
}

// Save problem
async function saveProblem(event) {
    event.preventDefault();
    
    const formData = {
        title: document.getElementById('problemTitleInput').value,
        description: document.getElementById('problemDescriptionInput').value,
        causes: [],
        impacts: [],
        feedback_loops: [],
        remediations: []
    };
    
    // Collect causes
    document.querySelectorAll('#causesContainer > div').forEach(div => {
        const inputs = div.querySelectorAll('input, select');
        if (inputs[0].value.trim()) {
            formData.causes.push({
                description: inputs[0].value.trim(),
                type: inputs[1].value
            });
        }
    });
    
    // Collect impacts
    document.querySelectorAll('#impactsContainer > div').forEach(div => {
        const inputs = div.querySelectorAll('input, select');
        if (inputs[0].value.trim()) {
            formData.impacts.push({
                description: inputs[0].value.trim(),
                type: inputs[1].value
            });
        }
    });
    
    // Collect feedback loops
    document.querySelectorAll('#loopsContainer > div').forEach(div => {
        const inputs = div.querySelectorAll('input, select');
        if (inputs[0].value.trim()) {
            const relationships = inputs[1].value.split('→').map(r => r.trim()).filter(r => r);
            formData.feedback_loops.push({
                description: inputs[0].value.trim(),
                type: inputs[1].value,
                relationships: relationships
            });
        }
    });
    
    // Collect remediations
    document.querySelectorAll('#remediationsContainer > div').forEach(div => {
        const inputs = div.querySelectorAll('input, select');
        if (inputs[0].value.trim()) {
            formData.remediations.push({
                description: inputs[0].value.trim(),
                type: inputs[1].value
            });
        }
    });
    
    try {
        const url = currentProblem ? `/api/problems/${currentProblem.id}` : '/api/problems';
        const method = currentProblem ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        if (response.ok) {
            closeModal();
            loadProblems();
            showSuccess(currentProblem ? 'Problem updated successfully' : 'Problem created successfully');
        } else {
            throw new Error('Failed to save problem');
        }
    } catch (error) {
        console.error('Error saving problem:', error);
        showError('Failed to save problem');
    }
}

// Delete problem
async function deleteProblem() {
    if (!currentProblem || !confirm('Are you sure you want to delete this problem?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/problems/${currentProblem.id}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            currentProblem = null;
            document.getElementById('detailsSection').classList.add('hidden');
            document.getElementById('diagramSection').classList.add('hidden');
            loadProblems();
            showSuccess('Problem deleted successfully');
        } else {
            throw new Error('Failed to delete problem');
        }
    } catch (error) {
        console.error('Error deleting problem:', error);
        showError('Failed to delete problem');
    }
}

// Export problem
function exportProblem() {
    if (!currentProblem) return;
    
    const dataStr = JSON.stringify(currentProblem, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `causal-loop-${currentProblem.title.replace(/\s+/g, '-')}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
}

// Utility functions
function showSuccess(message) {
    // Simple notification - you could replace with a better notification system
    const div = document.createElement('div');
    div.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
    div.textContent = message;
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 3000);
}

function showError(message) {
    const div = document.createElement('div');
    div.className = 'fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
    div.textContent = message;
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 3000);
}
