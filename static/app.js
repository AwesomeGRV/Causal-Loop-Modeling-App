let currentProblem = null;
let problems = [];
let network = null;
let simulationRunning = false;
let simulationData = {};
let behaviorChart = null;
let is3DView = false;
let collaborationActive = false;
let simulationSpeed = 5;
let currentTimeStep = 0;
let maxTimeSteps = 100;

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

// Load demo examples
function loadExample(type) {
    const examples = {
        population: {
            title: "Population Growth Dynamics",
            description: "Demonstration of exponential population growth through reinforcing feedback loops",
            causes: [
                { description: "Birth Rate", type: "primary" },
                { description: "Population Size", type: "primary" },
                { description: "Available Resources", type: "secondary" }
            ],
            impacts: [
                { description: "Resource Depletion", type: "environmental" },
                { description: "Economic Growth", type: "business" },
                { description: "Urban Expansion", type: "operational" }
            ],
            feedback_loops: [
                {
                    description: "Population Reinforcing Loop",
                    type: "reinforcing",
                    relationships: ["Population Size", "Birth Rate", "Population Size"]
                }
            ],
            remediations: [
                { description: "Family Planning Education", type: "preventive" },
                { description: "Resource Management", type: "long_term" }
            ]
        },
        market: {
            title: "Market Supply-Demand Dynamics",
            description: "Balancing feedback loop showing how markets reach equilibrium through price mechanisms",
            causes: [
                { description: "Supply Shortage", type: "primary" },
                { description: "High Demand", type: "primary" },
                { description: "Price Elasticity", type: "secondary" }
            ],
            impacts: [
                { description: "Price Increase", type: "business" },
                { description: "Reduced Demand", type: "operational" },
                { description: "Market Equilibrium", type: "business" }
            ],
            feedback_loops: [
                {
                    description: "Price Balancing Loop",
                    type: "balancing",
                    relationships: ["Price", "Demand", "Supply", "Price"]
                }
            ],
            remediations: [
                { description: "Supply Chain Optimization", type: "short_term" },
                { description: "Market Monitoring", type: "preventive" }
            ]
        },
        burnout: {
            title: "Employee Burnout Cycle",
            description: "Complex system showing how work pressure leads to burnout through multiple feedback loops",
            causes: [
                { description: "High Workload", type: "primary" },
                { description: "Time Pressure", type: "primary" },
                { description: "Lack of Support", type: "secondary" },
                { description: "Unclear Expectations", type: "latent" }
            ],
            impacts: [
                { description: "Decreased Performance", type: "operational" },
                { description: "Health Issues", type: "technical" },
                { description: "Employee Turnover", type: "business" }
            ],
            feedback_loops: [
                {
                    description: "Work Pressure Reinforcing Loop",
                    type: "reinforcing",
                    relationships: ["Workload", "Stress", "Reduced Performance", "More Workload"]
                },
                {
                    description: "Recovery Balancing Loop",
                    type: "balancing",
                    relationships: ["Burnout", "Rest Time", "Recovery", "Burnout"]
                }
            ],
            remediations: [
                { description: "Workload Redistribution", type: "short_term" },
                { description: "Mental Health Support", type: "long_term" },
                { description: "Process Optimization", type: "preventive" }
            ]
        },
        climate: {
            title: "Climate Change Feedback Loops",
            description: "Environmental system demonstrating dangerous reinforcing loops in climate change",
            causes: [
                { description: "CO2 Emissions", type: "primary" },
                { description: "Deforestation", type: "primary" },
                { description: "Industrial Activity", type: "secondary" }
            ],
            impacts: [
                { description: "Global Temperature Rise", type: "environmental" },
                { description: "Extreme Weather Events", type: "operational" },
                { description: "Ecosystem Disruption", type: "environmental" }
            ],
            feedback_loops: [
                {
                    description: "Ice-Albedo Reinforcing Loop",
                    type: "reinforcing",
                    relationships: ["Temperature", "Ice Melt", "Albedo Decrease", "Temperature"]
                },
                {
                    description: "Permafrost Reinforcing Loop",
                    type: "reinforcing",
                    relationships: ["Temperature", "Permafrost Thaw", "Methane Release", "Temperature"]
                }
            ],
            remediations: [
                { description: "Renewable Energy Transition", type: "long_term" },
                { description: "Reforestation Programs", type: "preventive" },
                { description: "Carbon Capture Technology", type: "long_term" }
            ]
        },
        addiction: {
            title: "Social Media Addiction",
            description: "Psychological feedback loops driving social media addiction and digital wellness",
            causes: [
                { description: "Dopamine Release", type: "primary" },
                { description: "Variable Rewards", type: "primary" },
                { description: "Social Validation", type: "secondary" }
            ],
            impacts: [
                { description: "Reduced Attention Span", type: "technical" },
                { description: "Sleep Disruption", type: "health" },
                { description: "Social Isolation", type: "operational" }
            ],
            feedback_loops: [
                {
                    description: "Dopamine Reinforcing Loop",
                    type: "reinforcing",
                    relationships: ["Social Media Use", "Dopamine Release", "Craving", "Social Media Use"]
                },
                {
                    description: "Wellness Balancing Loop",
                    type: "balancing",
                    relationships: ["Addiction", "Negative Consequences", "Awareness", "Reduced Use", "Addiction"]
                }
            ],
            remediations: [
                { description: "Digital Detox Periods", type: "short_term" },
                { description: "Mindfulness Training", type: "long_term" },
                { description: "App Usage Limits", type: "preventive" }
            ]
        },
        tutorial: {
            title: "Learn Causal Loop Diagramming",
            description: "Interactive tutorial for mastering systems thinking and causal loop modeling",
            causes: [
                { description: "🎯 Identify Key Variables", type: "primary" },
                { description: "🔗 Map Relationships", type: "primary" },
                { description: "🔄 Find Feedback Loops", type: "secondary" },
                { description: "⚖️ Balance vs Reinforce", type: "secondary" }
            ],
            impacts: [
                { description: "🧠 Better System Understanding", type: "educational" },
                { description: "🎯 Effective Problem Solving", type: "operational" },
                { description: "💡 Clear Communication", type: "business" },
                { description: "📈 Improved Decision Making", type: "business" }
            ],
            feedback_loops: [
                {
                    description: "📚 Learning Reinforcing Loop",
                    type: "reinforcing",
                    relationships: ["Practice", "Understanding", "Better Models", "More Practice"]
                },
                {
                    description: "🎯 Skill Development Balancing Loop",
                    type: "balancing",
                    relationships: ["Complexity", "Challenge", "Learning", "Skill Level", "Complexity"]
                }
            ],
            remediations: [
                { description: "📖 Start with Simple Models", type: "preventive" },
                { description: "👥 Get Feedback from Others", type: "short_term" },
                { description: "🌍 Study Real-World Examples", type: "long_term" },
                { description: "🔄 Iterate and Refine", type: "preventive" }
            ]
        }
    };

    const example = examples[type];
    if (!example) return;

    // Show sections
    document.getElementById('detailsSection').classList.remove('hidden');
    document.getElementById('diagramSection').classList.remove('hidden');
    
    // Display example details
    document.getElementById('problemTitle').textContent = example.title;
    displayCauses(example.causes || []);
    displayImpacts(example.impacts || []);
    displayLoops(example.feedback_loops || []);
    displayRemediations(example.remediations || []);
    
    // Create enhanced diagram for examples
    createExampleDiagram(example, type);
    
    // Add educational content for tutorial
    if (type === 'tutorial') {
        addTutorialContent();
    }
    
    // Scroll to details
    document.getElementById('detailsSection').scrollIntoView({ behavior: 'smooth' });
    
    // Show notification
    showSuccess(`Loaded ${example.title} example`);
}

// Add educational tutorial content
function addTutorialContent() {
    const detailsSection = document.getElementById('detailsSection');
    
    // Check if tutorial content already exists
    if (document.getElementById('tutorialContent')) {
        return;
    }
    
    const tutorialDiv = document.createElement('div');
    tutorialDiv.id = 'tutorialContent';
    tutorialDiv.className = 'mt-6 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200';
    tutorialDiv.innerHTML = `
        <h3 class="text-xl font-semibold mb-4 text-blue-800">
            <i class="fas fa-graduation-cap mr-2"></i>Understanding Causal Loop Diagrams
        </h3>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <h4 class="font-semibold mb-2 text-blue-700">🔄 Reinforcing Loops (R)</h4>
                <p class="text-sm text-gray-700 mb-3">
                    Reinforcing loops amplify change, creating exponential growth or decline. 
                    They represent virtuous or vicious cycles where more leads to more.
                </p>
                <div class="bg-white p-3 rounded border border-blue-200">
                    <strong>Examples:</strong> Population growth, learning curves, compound interest
                </div>
            </div>
            
            <div>
                <h4 class="font-semibold mb-2 text-orange-700">⚖️ Balancing Loops (B)</h4>
                <p class="text-sm text-gray-700 mb-3">
                    Balancing loops stabilize systems, creating equilibrium or goal-seeking behavior. 
                    They counteract change to maintain balance.
                </p>
                <div class="bg-white p-3 rounded border border-orange-200">
                    <strong>Examples:</strong> Thermostat control, market equilibrium, hunger regulation
                </div>
            </div>
        </div>
        
        <div class="mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <h4 class="font-semibold mb-2 text-yellow-800">
                <i class="fas fa-lightbulb mr-2"></i>Quick Start Guide
            </h4>
            <ol class="text-sm text-gray-700 space-y-1">
                <li><strong>1. Identify Variables:</strong> List key factors that influence your problem</li>
                <li><strong>2. Map Relationships:</strong> Draw arrows showing cause-and-effect links</li>
                <li><strong>3. Find Loops:</strong> Look for circular relationships that close back on themselves</li>
                <li><strong>4. Label Loops:</strong> Mark reinforcing loops (R) and balancing loops (B)</li>
                <li><strong>5. Analyze:</strong> Identify leverage points for intervention</li>
            </ol>
        </div>
        
        <div class="mt-4 flex gap-2">
            <button onclick="startInteractiveTutorial()" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
                <i class="fas fa-play mr-2"></i>Start Interactive Tutorial
            </button>
            <button onclick="loadExample('population')" class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition">
                <i class="fas fa-eye mr-2"></i>View Simple Example
            </button>
        </div>
    `;
    
    detailsSection.appendChild(tutorialDiv);
}

// Start interactive tutorial
function startInteractiveTutorial() {
    showSuccess('Interactive tutorial started! Follow the step-by-step guidance.');
    // Here you could add more sophisticated tutorial logic
    // For now, we'll just show a simple walkthrough
    setTimeout(() => {
        showTutorialStep(1);
    }, 1000);
}

// Show tutorial steps
function showTutorialStep(step) {
    const steps = [
        {
            title: "Step 1: Identify Your Problem",
            content: "Start by clearly defining the problem you want to analyze. What's the core issue?",
            action: "Try creating a new problem using the 'New Problem' button above."
        },
        {
            title: "Step 2: Find Root Causes",
            content: "Brainstorm all possible causes. Categorize them as primary (direct), secondary (indirect), or latent (hidden).",
            action: "Add at least 2-3 causes to understand the full scope."
        },
        {
            title: "Step 3: Map Impacts",
            content: "Identify all effects and consequences. Consider technical, business, and operational impacts.",
            action: "Think about both short-term and long-term consequences."
        },
        {
            title: "Step 4: Discover Feedback Loops",
            content: "Look for circular relationships where causes become effects and effects become causes.",
            action: "Ask: 'What happens if this continues?' to find reinforcing loops."
        },
        {
            title: "Step 5: Plan Solutions",
            content: "Develop short-term fixes, long-term solutions, and preventive measures.",
            action: "Target the most influential leverage points in your system."
        }
    ];
    
    if (step <= steps.length) {
        const currentStep = steps[step - 1];
        const message = `${currentStep.title}: ${currentStep.content} ${currentStep.action}`;
        showSuccess(message);
        
        if (step < steps.length) {
            setTimeout(() => {
                showTutorialStep(step + 1);
            }, 5000);
        } else {
            showSuccess('Tutorial completed! You now have the basics to create effective causal loop diagrams.');
        }
    }
}

// Create enhanced diagram for examples
function createExampleDiagram(example, type) {
    const container = document.getElementById('causalDiagram');
    
    // Create nodes with better positioning for examples
    const nodes = new vis.DataSet([
        { id: 'problem', label: example.title, color: '#ef4444', shape: 'box', font: { size: 14, bold: true } }
    ]);
    
    const edges = new vis.DataSet([]);
    
    // Add cause nodes with specific colors
    (example.causes || []).forEach((cause, index) => {
        const angle = (index * 120) - 60; // Spread causes in an arc
        const radius = 200;
        const x = Math.cos(angle * Math.PI / 180) * radius;
        const y = Math.sin(angle * Math.PI / 180) * radius;
        
        nodes.add({
            id: `cause_${index}`,
            label: cause.description,
            color: cause.type === 'primary' ? '#dc2626' : cause.type === 'secondary' ? '#f59e0b' : '#6b7280',
            shape: 'ellipse',
            x: x,
            y: y - 100,
            font: { size: 12 }
        });
        edges.add({
            from: `cause_${index}`,
            to: 'problem',
            arrows: 'to',
            color: { color: '#6b7280' },
            width: 2
        });
    });
    
    // Add impact nodes
    (example.impacts || []).forEach((impact, index) => {
        const angle = (index * 120) - 60;
        const radius = 200;
        const x = Math.cos(angle * Math.PI / 180) * radius;
        const y = Math.sin(angle * Math.PI / 180) * radius;
        
        nodes.add({
            id: `impact_${index}`,
            label: impact.description,
            color: impact.type === 'technical' ? '#2563eb' : impact.type === 'business' ? '#059669' : impact.type === 'operational' ? '#7c3aed' : impact.type === 'environmental' ? '#10b981' : impact.type === 'health' ? '#ec4899' : '#6b7280',
            shape: 'ellipse',
            x: x,
            y: y + 100,
            font: { size: 12 }
        });
        edges.add({
            from: 'problem',
            to: `impact_${index}`,
            arrows: 'to',
            color: { color: '#6b7280' },
            width: 2
        });
    });
    
    // Add feedback loop edges with enhanced styling
    (example.feedback_loops || []).forEach((loop, loopIndex) => {
        if (loop.relationships && loop.relationships.length > 1) {
            const loopColor = loop.type === 'reinforcing' ? '#16a34a' : '#d97706';
            
            for (let i = 0; i < loop.relationships.length - 1; i++) {
                const fromNode = loop.relationships[i].replace(/\s+/g, '_');
                const toNode = loop.relationships[i + 1].replace(/\s+/g, '_');
                
                // Create intermediate nodes for loop relationships if they don't exist
                if (!nodes.get(fromNode)) {
                    nodes.add({
                        id: fromNode,
                        label: loop.relationships[i],
                        color: '#fbbf24',
                        shape: 'box',
                        font: { size: 11 }
                    });
                }
                
                if (!nodes.get(toNode)) {
                    nodes.add({
                        id: toNode,
                        label: loop.relationships[i + 1],
                        color: '#fbbf24',
                        shape: 'box',
                        font: { size: 11 }
                    });
                }
                
                edges.add({
                    from: fromNode,
                    to: toNode,
                    arrows: 'to',
                    color: { color: loopColor },
                    width: 3,
                    label: `${loop.type === 'reinforcing' ? 'R' : 'B'}${loopIndex + 1}`,
                    font: { size: 12, bold: true, color: loopColor }
                });
            }
        }
    });
    
    const data = { nodes, edges };
    const options = {
        layout: {
            improvedLayout: true,
            hierarchical: {
                enabled: false
            }
        },
        physics: {
            enabled: true,
            barnesHut: {
                gravitationalConstant: -2000,
                centralGravity: 0.3,
                springLength: 150,
                springConstant: 0.04,
                damping: 0.09
            }
        },
        interaction: {
            hover: true,
            tooltipDelay: 200,
            zoomView: true,
            dragView: true
        },
        nodes: {
            borderWidth: 2,
            shadow: true
        },
        edges: {
            smooth: {
                type: 'curvedCW',
                roundness: 0.2
            },
            shadow: true
        }
    };
    
    if (network) {
        network.destroy();
    }
    network = new vis.Network(container, data, options);
    
    // Fit the network to show all nodes
    network.once('stabilized', function() {
        network.fit();
    });
}

// ==================== ADVANCED SIMULATION FEATURES ====================

// Toggle simulation
function toggleSimulation() {
    const btn = document.getElementById('simulationBtn');
    const controls = document.getElementById('simulationControls');
    const timeline = document.getElementById('timeline');
    
    if (simulationRunning) {
        stopSimulation();
        btn.innerHTML = '<i class="fas fa-play mr-2"></i>Start Simulation';
        btn.className = 'bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition';
        controls.classList.add('hidden');
        timeline.classList.add('hidden');
    } else {
        startSimulation();
        btn.innerHTML = '<i class="fas fa-pause mr-2"></i>Pause Simulation';
        btn.className = 'bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition';
        controls.classList.remove('hidden');
        timeline.classList.remove('hidden');
        initializeSimulation();
    }
}

// Start simulation
function startSimulation() {
    if (!currentProblem) {
        showError('Please load a problem first');
        return;
    }
    
    simulationRunning = true;
    initializeBehaviorChart();
    createVariableControls();
    simulateStep();
}

// Stop simulation
function stopSimulation() {
    simulationRunning = false;
    if (simulationInterval) {
        clearInterval(simulationInterval);
    }
}

// Reset simulation
function resetSimulation() {
    stopSimulation();
    currentTimeStep = 0;
    simulationData = {};
    updateTimeline();
    updateCurrentTime();
    
    // Reset chart
    if (behaviorChart) {
        behaviorChart.data.datasets.forEach(dataset => {
            dataset.data = [];
        });
        behaviorChart.update();
    }
    
    // Reset variable controls
    document.getElementById('variableControls').innerHTML = '';
    
    // Reset metrics
    document.getElementById('stabilityMetric').textContent = 'Stable';
    document.getElementById('growthMetric').textContent = '0%';
    document.getElementById('dominanceMetric').textContent = 'Balanced';
    
    showSuccess('Simulation reset');
}

// Initialize simulation data
function initializeSimulation() {
    simulationData = {
        variables: {},
        timeSteps: []
    };
    
    // Initialize variables from current problem
    if (currentProblem) {
        // Add causes as variables
        (currentProblem.causes || []).forEach((cause, index) => {
            simulationData.variables[`cause_${index}`] = {
                name: cause.description,
                value: 50,
                history: [50],
                type: 'cause'
            };
        });
        
        // Add impacts as variables
        (currentProblem.impacts || []).forEach((impact, index) => {
            simulationData.variables[`impact_${index}`] = {
                name: impact.description,
                value: 30,
                history: [30],
                type: 'impact'
            };
        });
    }
}

// Create variable controls for scenario testing
function createVariableControls() {
    const container = document.getElementById('variableControls');
    container.innerHTML = '';
    
    Object.keys(simulationData.variables).forEach(key => {
        const variable = simulationData.variables[key];
        const controlDiv = document.createElement('div');
        controlDiv.className = 'bg-white p-3 rounded border';
        controlDiv.innerHTML = `
            <label class="block text-sm font-medium text-gray-700 mb-1">${variable.name}</label>
            <input type="range" min="0" max="100" value="${variable.value}" 
                   class="w-full" onchange="adjustVariable('${key}', this.value)">
            <span class="text-xs text-gray-600">Value: <span id="${key}_value">${variable.value.toFixed(1)}</span></span>
        `;
        container.appendChild(controlDiv);
    });
}

// Adjust variable value
function adjustVariable(variableId, value) {
    if (simulationData.variables[variableId]) {
        simulationData.variables[variableId].value = parseFloat(value);
        document.getElementById(`${variableId}_value`).textContent = parseFloat(value).toFixed(1);
        
        // Add to activity feed if collaboration is active
        if (collaborationActive) {
            addActivityFeedEntry(`Adjusted ${simulationData.variables[variableId].name} to ${value}`);
        }
    }
}

// Simulate one step
function simulateStep() {
    if (!simulationRunning) return;
    
    currentTimeStep++;
    
    // Apply feedback loop dynamics
    applyFeedbackLoops();
    
    // Update variable histories
    Object.keys(simulationData.variables).forEach(key => {
        const variable = simulationData.variables[key];
        variable.history.push(variable.value);
        
        // Keep only last 50 time steps for performance
        if (variable.history.length > 50) {
            variable.history.shift();
        }
    });
    
    // Update visualizations
    updateBehaviorChart();
    updateTimeline();
    updateCurrentTime();
    updateSystemMetrics();
    updateNodeVisualization();
    
    // Continue simulation
    if (currentTimeStep < maxTimeSteps) {
        simulationInterval = setTimeout(() => simulateStep(), 1000 / simulationSpeed);
    } else {
        stopSimulation();
        showSuccess('Simulation completed');
    }
}

// Apply feedback loop dynamics
function applyFeedbackLoops() {
    if (!currentProblem || !currentProblem.feedback_loops) return;
    
    currentProblem.feedback_loops.forEach(loop => {
        if (loop.type === 'reinforcing') {
            // Reinforcing loop: amplify changes
            Object.keys(simulationData.variables).forEach(key => {
                const variable = simulationData.variables[key];
                const growth = 0.05 * (variable.value - 50) / 50; // Growth proportional to deviation
                variable.value = Math.max(0, Math.min(100, variable.value + growth * simulationSpeed));
            });
        } else if (loop.type === 'balancing') {
            // Balancing loop: move toward equilibrium
            Object.keys(simulationData.variables).forEach(key => {
                const variable = simulationData.variables[key];
                const adjustment = 0.1 * (50 - variable.value) / 50; // Move toward 50
                variable.value = Math.max(0, Math.min(100, variable.value + adjustment * simulationSpeed));
            });
        }
    });
}

// Initialize behavior chart
function initializeBehaviorChart() {
    const ctx = document.getElementById('behaviorChart').getContext('2d');
    
    if (behaviorChart) {
        behaviorChart.destroy();
    }
    
    const datasets = Object.keys(simulationData.variables).map(key => {
        const variable = simulationData.variables[key];
        return {
            label: variable.name,
            data: variable.history,
            borderColor: getColorForVariable(variable.type),
            backgroundColor: getColorForVariable(variable.type, 0.1),
            tension: 0.4,
            fill: false
        };
    });
    
    behaviorChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: Array.from({length: 50}, (_, i) => `T${i}`),
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom'
                }
            }
        }
    });
}

// Update behavior chart
function updateBehaviorChart() {
    if (!behaviorChart) return;
    
    behaviorChart.data.datasets.forEach((dataset, index) => {
        const variableKey = Object.keys(simulationData.variables)[index];
        if (simulationData.variables[variableKey]) {
            dataset.data = [...simulationData.variables[variableKey].history];
        }
    });
    
    behaviorChart.update('none'); // Update without animation for performance
}

// Get color for variable
function getColorForVariable(type, alpha = 1) {
    const colors = {
        cause: `rgba(239, 68, 68, ${alpha})`,
        impact: `rgba(59, 130, 246, ${alpha})`,
        environmental: `rgba(16, 185, 129, ${alpha})`,
        health: `rgba(236, 72, 153, ${alpha})`,
        educational: `rgba(139, 92, 246, ${alpha})`
    };
    return colors[type] || `rgba(107, 114, 128, ${alpha})`;
}

// Update timeline
function updateTimeline() {
    const progress = (currentTimeStep / maxTimeSteps) * 100;
    document.getElementById('timelineProgress').style.width = `${progress}%`;
    document.getElementById('timelineInfo').textContent = `${currentTimeStep} / ${maxTimeSteps} periods`;
}

// Update current time display
function updateCurrentTime() {
    const period = document.getElementById('timePeriod').value;
    document.getElementById('currentTime').textContent = `T${currentTimeStep}`;
}

// Update system metrics
function updateSystemMetrics() {
    if (!simulationData.variables) return;
    
    const values = Object.values(simulationData.variables).map(v => v.value);
    const avgValue = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + Math.pow(b - avgValue, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    
    // Calculate growth rate
    let growthRate = 0;
    if (currentTimeStep > 1) {
        Object.values(simulationData.variables).forEach(variable => {
            if (variable.history.length > 1) {
                const prev = variable.history[variable.history.length - 2];
                const curr = variable.value;
                growthRate += ((curr - prev) / prev) * 100;
            }
        });
        growthRate /= Object.keys(simulationData.variables).length;
    }
    
    // Update metrics display
    document.getElementById('stabilityMetric').textContent = stdDev < 10 ? 'Stable' : stdDev < 20 ? 'Moderate' : 'Volatile';
    document.getElementById('growthMetric').textContent = `${growthRate.toFixed(1)}%`;
    
    // Determine loop dominance
    const reinforcingCount = (currentProblem.feedback_loops || []).filter(l => l.type === 'reinforcing').length;
    const balancingCount = (currentProblem.feedback_loops || []).filter(l => l.type === 'balancing').length;
    const dominance = reinforcingCount > balancingCount ? 'Reinforcing' : balancingCount > reinforcingCount ? 'Balancing' : 'Balanced';
    document.getElementById('dominanceMetric').textContent = dominance;
}

// Update node visualization
function updateNodeVisualization() {
    if (!network || !simulationData.variables) return;
    
    Object.keys(simulationData.variables).forEach(key => {
        const variable = simulationData.variables[key];
        const node = network.body.data.nodes.get(key);
        
        if (node) {
            // Update node size based on value
            const size = 20 + (variable.value / 100) * 30;
            network.body.data.nodes.update({
                id: key,
                size: size,
                borderWidth: 2 + (variable.value / 100) * 3
            });
        }
    });
}

// Update simulation speed
function updateSimulationSpeed(value) {
    simulationSpeed = parseInt(value);
    document.getElementById('speedValue').textContent = `${value}x`;
}

// ==================== 3D VISUALIZATION ====================

// Toggle 3D view
function toggle3DView() {
    const btn = document.getElementById('view3DBtn');
    
    if (is3DView) {
        // Switch back to 2D
        is3DView = false;
        btn.innerHTML = '<i class="fas fa-cube mr-2"></i>3D View';
        btn.className = 'bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition';
        
        // Recreate 2D diagram
        if (currentProblem) {
            createCausalDiagram(currentProblem);
        }
    } else {
        // Switch to 3D
        is3DView = true;
        btn.innerHTML = '<i class="fas fa-square mr-2"></i>2D View';
        btn.className = 'bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition';
        
        // Create 3D visualization
        create3DDiagram();
    }
}

// Create 3D diagram
function create3DDiagram() {
    const container = document.getElementById('causalDiagram');
    container.innerHTML = ''; // Clear 2D content
    
    // Three.js setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf8fafc);
    
    const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(0, 0, 500);
    
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);
    
    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.4);
    directionalLight.position.set(100, 100, 50);
    scene.add(directionalLight);
    
    // Create 3D nodes
    const nodes = [];
    const edges = [];
    
    if (currentProblem) {
        // Add problem node (center)
        const problemGeometry = new THREE.BoxGeometry(60, 40, 20);
        const problemMaterial = new THREE.MeshPhongMaterial({ color: 0xef4444 });
        const problemMesh = new THREE.Mesh(problemGeometry, problemMaterial);
        problemMesh.position.set(0, 0, 0);
        scene.add(problemMesh);
        nodes.push(problemMesh);
        
        // Add cause nodes
        (currentProblem.causes || []).forEach((cause, index) => {
            const angle = (index * 2 * Math.PI) / (currentProblem.causes.length || 1);
            const radius = 150;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            
            const geometry = new THREE.SphereGeometry(25, 32, 16);
            const color = cause.type === 'primary' ? 0xdc2626 : cause.type === 'secondary' ? 0xf59e0b : 0x6b7280;
            const material = new THREE.MeshPhongMaterial({ color: color });
            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.set(x, y, -50);
            scene.add(mesh);
            nodes.push(mesh);
            
            // Add edge
            const edgeGeometry = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(x, y, -50),
                new THREE.Vector3(0, 0, 0)
            ]);
            const edgeMaterial = new THREE.LineBasicMaterial({ color: 0x6b7280 });
            const edge = new THREE.Line(edgeGeometry, edgeMaterial);
            scene.add(edge);
            edges.push(edge);
        });
        
        // Add impact nodes
        (currentProblem.impacts || []).forEach((impact, index) => {
            const angle = (index * 2 * Math.PI) / (currentProblem.impacts.length || 1);
            const radius = 150;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            
            const geometry = new THREE.SphereGeometry(25, 32, 16);
            const color = impact.type === 'technical' ? 0x2563eb : impact.type === 'business' ? 0x059669 : 0x7c3aed;
            const material = new THREE.MeshPhongMaterial({ color: color });
            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.set(x, y, 50);
            scene.add(mesh);
            nodes.push(mesh);
            
            // Add edge
            const edgeGeometry = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(0, 0, 0),
                new THREE.Vector3(x, y, 50)
            ]);
            const edgeMaterial = new THREE.LineBasicMaterial({ color: 0x6b7280 });
            const edge = new THREE.Line(edgeGeometry, edgeMaterial);
            scene.add(edge);
            edges.push(edge);
        });
    }
    
    // Animation loop
    function animate() {
        requestAnimationFrame(animate);
        
        // Rotate nodes slowly
        nodes.forEach((node, index) => {
            node.rotation.y += 0.005;
            node.position.z = Math.sin(Date.now() * 0.001 + index) * 10;
        });
        
        renderer.render(scene, camera);
    }
    
    animate();
    
    // Mouse controls
    let mouseX = 0, mouseY = 0;
    container.addEventListener('mousemove', (event) => {
        const rect = container.getBoundingClientRect();
        mouseX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouseY = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        camera.position.x = mouseX * 50;
        camera.position.y = mouseY * 50;
        camera.lookAt(0, 0, 0);
    });
}

// ==================== COLLABORATION FEATURES ====================

// Toggle collaboration
function toggleCollaboration() {
    const btn = document.getElementById('collaborationBtn');
    const panel = document.getElementById('collaborationPanel');
    
    if (collaborationActive) {
        collaborationActive = false;
        panel.classList.add('hidden');
        btn.innerHTML = '<i class="fas fa-users mr-2"></i>Collaborate';
        btn.className = 'bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition';
    } else {
        collaborationActive = true;
        panel.classList.remove('hidden');
        btn.innerHTML = '<i class="fas fa-users-slash mr-2"></i>Stop Collaboration';
        btn.className = 'bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition';
        
        // Simulate other users joining
        setTimeout(() => {
            addCollaborator('Alice Johnson', 'Viewer');
            addActivityFeedEntry('Alice Johnson joined the session');
        }, 2000);
        
        setTimeout(() => {
            addCollaborator('Bob Smith', 'Editor');
            addActivityFeedEntry('Bob Smith joined the session');
        }, 4000);
    }
}

// Generate share link
function generateShareLink() {
    const shareUrl = `${window.location.origin}${window.location.pathname}?session=${generateSessionId()}`;
    
    // Copy to clipboard
    navigator.clipboard.writeText(shareUrl).then(() => {
        showSuccess('Share link copied to clipboard!');
        addActivityFeedEntry('Share link generated');
    }).catch(() => {
        showError('Failed to copy share link');
    });
}

// Generate session ID
function generateSessionId() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Add collaborator
function addCollaborator(name, role) {
    const list = document.getElementById('collaboratorsList');
    const collaboratorDiv = document.createElement('div');
    collaboratorDiv.className = 'flex items-center gap-2';
    collaboratorDiv.innerHTML = `
        <div class="w-2 h-2 bg-green-500 rounded-full"></div>
        <span class="text-sm">${name} (${role})</span>
    `;
    list.appendChild(collaboratorDiv);
}

// Add activity feed entry
function addActivityFeedEntry(message) {
    const feed = document.getElementById('activityFeed');
    const entry = document.createElement('div');
    const time = new Date().toLocaleTimeString();
    entry.innerHTML = `<span class="text-gray-500">[${time}]</span> ${message}`;
    feed.appendChild(entry);
    feed.scrollTop = feed.scrollHeight;
    
    // Keep only last 10 entries
    while (feed.children.length > 10) {
        feed.removeChild(feed.firstChild);
    }
}
