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
let aiAnalysisActive = false;
let customTemplates = [];
let socket = null;
let d3Visualizer = null;
let mlModelsLoaded = false;

// Performance optimization variables
let simulationInterval = null;
let frameRequestId = null;
let lastFrameTime = 0;
let targetFPS = 60;
let chartUpdateThrottle = 100; // Update chart every 100ms max
let lastChartUpdate = 0;
let performanceMetrics = {
    frameCount: 0,
    avgFrameTime: 0,
    simulationSteps: 0,
    chartUpdates: 0
};

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeWebSocket();
    initializeD3Visualizer();
    loadProblems();
});

// Initialize WebSocket connection
function initializeWebSocket() {
    socket = io();
    
    socket.on('connect', function() {
        console.log('Connected to server');
        updateConnectionStatus(true);
    });
    
    socket.on('disconnect', function() {
        console.log('Disconnected from server');
        updateConnectionStatus(false);
    });
    
    socket.on('analysis_update', function(data) {
        handleRealTimeAnalysis(data);
    });
    
    socket.on('system_stats', function(data) {
        updateSystemStats(data);
    });
    
    socket.on('models_updated', function(data) {
        handleModelsUpdated(data);
    });
    
    socket.on('problem_added', function(data) {
        handleProblemAdded(data);
    });
}

// Initialize D3 visualizer
function initializeD3Visualizer() {
    if (typeof D3CausalLoopVisualizer !== 'undefined') {
        d3Visualizer = new D3CausalLoopVisualizer('d3Diagram');
    }
}

// Update connection status indicator
function updateConnectionStatus(connected) {
    const statusElement = document.getElementById('connectionStatus');
    if (statusElement) {
        statusElement.className = connected ? 
            'inline-block w-2 h-2 bg-green-500 rounded-full' : 
            'inline-block w-2 h-2 bg-red-500 rounded-full';
        statusElement.title = connected ? 'Connected' : 'Disconnected';
    }
}

// Handle real-time analysis updates
function handleRealTimeAnalysis(data) {
    const { problem_id, type, analysis_data } = data;
    
    if (currentProblem && currentProblem.id === problem_id) {
        switch (type) {
            case 'archetype_prediction':
                displayArchetypePrediction(analysis_data);
                break;
            case 'loop_suggestions':
                displayLoopSuggestions(analysis_data);
                break;
            case 'impact_prediction':
                displayImpactPrediction(analysis_data);
                break;
            case 'simulation':
                displaySimulationResults(analysis_data);
                break;
        }
    }
}

// Display archetype prediction
function displayArchetypePrediction(data) {
    const container = document.getElementById('archetypePrediction');
    if (!container) return;
    
    container.innerHTML = `
        <div class="bg-white rounded-lg p-4 border border-gray-200">
            <h4 class="font-semibold text-gray-800 mb-2">System Archetype Prediction</h4>
            <div class="space-y-2">
                <div class="flex justify-between items-center">
                    <span class="text-sm font-medium">Predicted Archetype:</span>
                    <span class="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">${data.predicted_archetype}</span>
                </div>
                <div class="flex justify-between items-center">
                    <span class="text-sm font-medium">Confidence:</span>
                    <span class="text-sm">${(data.confidence * 100).toFixed(1)}%</span>
                </div>
                <div class="mt-3">
                    <div class="text-sm font-medium mb-1">Probability Distribution:</div>
                    ${Object.entries(data.probability_distribution)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 3)
                        .map(([archetype, prob]) => `
                            <div class="flex justify-between items-center py-1">
                                <span class="text-xs">${archetype}</span>
                                <div class="flex items-center">
                                    <div class="w-20 bg-gray-200 rounded-full h-2 mr-2">
                                        <div class="bg-blue-500 h-2 rounded-full" style="width: ${prob * 100}%"></div>
                                    </div>
                                    <span class="text-xs">${(prob * 100).toFixed(1)}%</span>
                                </div>
                            </div>
                        `).join('')}
                </div>
            </div>
        </div>
    `;
}

// Display loop suggestions
function displayLoopSuggestions(data) {
    const container = document.getElementById('loopSuggestions');
    if (!container) return;
    
    container.innerHTML = `
        <div class="bg-white rounded-lg p-4 border border-gray-200">
            <h4 class="font-semibold text-gray-800 mb-2">AI Loop Suggestions</h4>
            <div class="space-y-2">
                ${data.suggested_loops.map((loop, index) => `
                    <div class="flex items-start space-x-2 p-2 bg-gray-50 rounded">
                        <span class="inline-block px-2 py-1 text-xs rounded ${
                            loop.type === 'reinforcing' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }">
                            ${loop.type === 'reinforcing' ? 'R' : 'B'}
                        </span>
                        <div class="flex-1">
                            <p class="text-sm">${loop.description}</p>
                            <p class="text-xs text-gray-500">Confidence: ${(loop.confidence * 100).toFixed(1)}%</p>
                        </div>
                        <button onclick="addSuggestedLoop(${index})" class="text-blue-600 hover:text-blue-700">
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    
    // Store suggestions globally for access
    window.currentLoopSuggestions = data.suggested_loops;
}

// Display impact prediction
function displayImpactPrediction(data) {
    const container = document.getElementById('impactPrediction');
    if (!container) return;
    
    container.innerHTML = `
        <div class="bg-white rounded-lg p-4 border border-gray-200">
            <h4 class="font-semibold text-gray-800 mb-2">Impact Prediction</h4>
            <div class="space-y-2">
                <div class="flex justify-between items-center">
                    <span class="text-sm font-medium">Predicted Impact Count:</span>
                    <span class="text-sm">${data.predicted_impact_count}</span>
                </div>
                <div class="flex justify-between items-center">
                    <span class="text-sm font-medium">Confidence:</span>
                    <span class="text-sm">${(data.confidence * 100).toFixed(1)}%</span>
                </div>
                <div class="mt-3">
                    <div class="text-sm font-medium mb-1">Predicted Impact Types:</div>
                    ${Object.entries(data.predicted_types)
                        .sort((a, b) => b[1] - a[1])
                        .map(([type, prob]) => `
                            <div class="flex justify-between items-center py-1">
                                <span class="text-xs capitalize">${type}</span>
                                <div class="flex items-center">
                                    <div class="w-20 bg-gray-200 rounded-full h-2 mr-2">
                                        <div class="bg-purple-500 h-2 rounded-full" style="width: ${prob * 100}%"></div>
                                    </div>
                                    <span class="text-xs">${(prob * 100).toFixed(1)}%</span>
                                </div>
                            </div>
                        `).join('')}
                </div>
            </div>
        </div>
    `;
}

// Display simulation results
function displaySimulationResults(data) {
    const container = document.getElementById('simulationResults');
    if (!container) return;
    
    if (data.error) {
        container.innerHTML = `
            <div class="bg-red-50 border border-red-200 rounded-lg p-4">
                <p class="text-red-800 text-sm">Simulation error: ${data.error}</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <div class="bg-white rounded-lg p-4 border border-gray-200">
            <h4 class="font-semibold text-gray-800 mb-2">Loop Dynamics Simulation</h4>
            <div class="space-y-3">
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <div class="text-sm font-medium">Reinforcing Loops</div>
                        <div class="text-lg">${data.reinforcing_loops.count}</div>
                        <div class="text-xs text-gray-500">Final values: ${data.reinforcing_loops.final_values.map(v => v.toFixed(2)).join(', ')}</div>
                    </div>
                    <div>
                        <div class="text-sm font-medium">Balancing Loops</div>
                        <div class="text-lg">${data.balancing_loops.count}</div>
                        <div class="text-xs text-gray-500">Final values: ${data.balancing_loops.final_values.map(v => v.toFixed(2)).join(', ')}</div>
                    </div>
                </div>
                <div>
                    <div class="text-sm font-medium">System Stability</div>
                    <div class="flex items-center space-x-2">
                        <div class="flex-1 bg-gray-200 rounded-full h-2">
                            <div class="bg-green-500 h-2 rounded-full" style="width: ${data.system_stability.stability_score * 100}%"></div>
                        </div>
                        <span class="text-sm">${data.system_stability.behavior}</span>
                    </div>
                </div>
                <div id="simulationChart" class="h-48"></div>
            </div>
        </div>
    `;
    
    // Create simulation chart
    createSimulationChart(data);
}

// Create simulation chart using Plotly
function createSimulationChart(data) {
    const chartContainer = document.getElementById('simulationChart');
    if (!chartContainer) return;
    
    const traces = [];
    
    // Add reinforcing loops
    if (data.reinforcing_loops.count > 0) {
        for (let i = 0; i < data.reinforcing_loops.count; i++) {
            traces.push({
                x: data.time_points,
                y: data.reinforcing_loops.history.map(step => step[i] || 0),
                type: 'scatter',
                mode: 'lines',
                name: `Reinforcing ${i + 1}`,
                line: { color: '#2ecc71' }
            });
        }
    }
    
    // Add balancing loops
    if (data.balancing_loops.count > 0) {
        for (let i = 0; i < data.balancing_loops.count; i++) {
            traces.push({
                x: data.time_points,
                y: data.balancing_loops.history.map(step => step[i] || 0),
                type: 'scatter',
                mode: 'lines',
                name: `Balancing ${i + 1}`,
                line: { color: '#e74c3c' }
            });
        }
    }
    
    const layout = {
        title: 'Loop Dynamics Over Time',
        xaxis: { title: 'Time' },
        yaxis: { title: 'Value' },
        margin: { t: 30, r: 20, b: 40, l: 50 },
        height: 200
    };
    
    Plotly.newPlot(chartContainer, traces, layout, {responsive: true});
}

// Update system statistics
function updateSystemStats(data) {
    const statsContainer = document.getElementById('systemStats');
    if (!statsContainer) return;
    
    statsContainer.innerHTML = `
        <div class="grid grid-cols-4 gap-2 text-xs">
            <div class="text-center">
                <div class="font-semibold">${data.total_problems}</div>
                <div class="text-gray-500">Problems</div>
            </div>
            <div class="text-center">
                <div class="font-semibold">${data.total_causes}</div>
                <div class="text-gray-500">Causes</div>
            </div>
            <div class="text-center">
                <div class="font-semibold">${data.total_impacts}</div>
                <div class="text-gray-500">Impacts</div>
            </div>
            <div class="text-center">
                <div class="font-semibold">${data.total_loops}</div>
                <div class="text-gray-500">Loops</div>
            </div>
        </div>
    `;
}

// Handle models updated event
function handleModelsUpdated(data) {
    console.log('Models updated:', data);
    mlModelsLoaded = true;
    
    // Show notification
    showNotification(`${data.type} models trained successfully`, 'success');
}

// Handle problem added event
function handleProblemAdded(data) {
    problems.push(data);
    displayProblems();
    showNotification('New problem added', 'info');
}

// Show notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
        type === 'success' ? 'bg-green-500 text-white' :
        type === 'error' ? 'bg-red-500 text-white' :
        'bg-blue-500 text-white'
    }`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

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
    
    // Use requestAnimationFrame for smooth performance
    startOptimizedSimulationLoop();
}

// Optimized simulation loop using requestAnimationFrame
function startOptimizedSimulationLoop() {
    if (!simulationRunning) return;
    
    const frameTime = 1000 / targetFPS;
    const now = performance.now();
    
    if (now - lastFrameTime >= frameTime) {
        const stepStartTime = performance.now();
        
        // Execute simulation step
        simulateStep();
        
        // Track performance metrics
        const stepTime = performance.now() - stepStartTime;
        updatePerformanceMetrics(stepTime);
        
        lastFrameTime = now;
    }
    
    // Continue loop
    frameRequestId = requestAnimationFrame(startOptimizedSimulationLoop);
}

// Update performance metrics
function updatePerformanceMetrics(stepTime) {
    performanceMetrics.frameCount++;
    performanceMetrics.simulationSteps++;
    
    // Calculate rolling average frame time
    const alpha = 0.1; // Smoothing factor
    performanceMetrics.avgFrameTime = 
        performanceMetrics.avgFrameTime * (1 - alpha) + stepTime * alpha;
    
    // Adjust target FPS based on performance
    if (performanceMetrics.avgFrameTime > 16) { // Slower than 60fps
        targetFPS = Math.max(30, targetFPS - 1);
    } else if (performanceMetrics.avgFrameTime < 10) { // Faster than needed
        targetFPS = Math.min(60, targetFPS + 1);
    }
}

// Stop simulation
function stopSimulation() {
    simulationRunning = false;
    
    // Clean up animation frame
    if (frameRequestId) {
        cancelAnimationFrame(frameRequestId);
        frameRequestId = null;
    }
    
    // Clean up interval fallback
    if (simulationInterval) {
        clearInterval(simulationInterval);
        simulationInterval = null;
    }
}

// Reset simulation
function resetSimulation() {
    stopSimulation();
    currentTimeStep = 0;
    simulationData = {};
    lastChartUpdate = 0;
    performanceMetrics = {
        frameCount: 0,
        avgFrameTime: 0,
        simulationSteps: 0,
        chartUpdates: 0
    };
    
    updateTimeline();
    updateCurrentTime();
    
    // Reset chart
    if (behaviorChart) {
        behaviorChart.data.datasets.forEach(dataset => {
            dataset.data = [];
        });
        behaviorChart.update('none'); // Update without animation
    }
    
    // Reset variable controls
    document.getElementById('variableControls').innerHTML = '';
    
    // Reset metrics
    document.getElementById('stabilityMetric').textContent = 'Stable';
    document.getElementById('growthMetric').textContent = '0%';
    document.getElementById('dominanceMetric').textContent = 'Balanced';
    
    showSuccess('Simulation reset');
}

// Initialize simulation data with smart data management
function initializeSimulation() {
    simulationData = {
        variables: {},
        timeSteps: [],
        maxHistorySize: Math.min(100, maxTimeSteps) // Dynamic history size
    };
    
    // Initialize variables from current problem
    if (currentProblem) {
        // Add causes as variables
        (currentProblem.causes || []).forEach((cause, index) => {
            simulationData.variables[`cause_${index}`] = {
                name: cause.description,
                value: 50,
                history: [50],
                type: 'cause',
                lastUpdate: Date.now()
            };
        });
        
        // Add impacts as variables
        (currentProblem.impacts || []).forEach((impact, index) => {
            simulationData.variables[`impact_${index}`] = {
                name: impact.description,
                value: 30,
                history: [30],
                type: 'impact',
                lastUpdate: Date.now()
            };
        });
    }
}

// Optimized simulate step with smart data management
function simulateStep() {
    if (!simulationRunning) return;
    
    currentTimeStep++;
    
    // Apply feedback loop dynamics
    applyFeedbackLoops();
    
    // Update variable histories with smart memory management
    Object.keys(simulationData.variables).forEach(key => {
        const variable = simulationData.variables[key];
        variable.history.push(variable.value);
        variable.lastUpdate = Date.now();
        
        // Smart history management - keep only relevant data points
        const maxHistory = simulationData.maxHistorySize;
        if (variable.history.length > maxHistory) {
            // Keep more recent data, sample older data
            if (variable.history.length > maxHistory * 2) {
                // Sample every nth point for older data
                const keepPoints = Math.floor(maxHistory * 0.7);
                const sampleEvery = Math.floor((variable.history.length - keepPoints) / keepPoints);
                const sampledHistory = [];
                
                // Keep recent points
                for (let i = variable.history.length - keepPoints; i < variable.history.length; i++) {
                    sampledHistory.push(variable.history[i]);
                }
                
                variable.history = sampledHistory;
            } else {
                // Simple trim for moderately sized history
                variable.history.shift();
            }
        }
    });
    
    // Throttled visual updates for performance
    const now = Date.now();
    if (now - lastChartUpdate >= chartUpdateThrottle) {
        updateBehaviorChart();
        lastChartUpdate = now;
        performanceMetrics.chartUpdates++;
    }
    
    // Always update critical UI elements
    updateTimeline();
    updateCurrentTime();
    updateSystemMetrics();
    updateNodeVisualization();
    
    // Continue simulation with optimized timing
    if (currentTimeStep < maxTimeSteps) {
        // Use setTimeout for consistent timing regardless of frame rate
        const stepDelay = Math.max(50, 1000 / simulationSpeed);
        setTimeout(() => {
            if (simulationRunning) {
                simulateStep();
            }
        }, stepDelay);
    } else {
        stopSimulation();
        showSuccess('Simulation completed');
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
        simulationData.variables[variableId].lastUpdate = Date.now();
        document.getElementById(`${variableId}_value`).textContent = parseFloat(value).toFixed(1);
        
        // Add to activity feed if collaboration is active
        if (collaborationActive) {
            addActivityFeedEntry(`Adjusted ${simulationData.variables[variableId].name} to ${value}`);
        }
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

// Initialize behavior chart with performance optimizations
function initializeBehaviorChart() {
    const ctx = document.getElementById('behaviorChart').getContext('2d');
    
    if (behaviorChart) {
        behaviorChart.destroy();
    }
    
    const datasets = Object.keys(simulationData.variables).map(key => {
        const variable = simulationData.variables[key];
        return {
            label: variable.name,
            data: [...variable.history], // Copy array to avoid reference issues
            borderColor: getColorForVariable(variable.type),
            backgroundColor: getColorForVariable(variable.type, 0.1),
            tension: 0.4,
            fill: false,
            borderWidth: 2,
            pointRadius: 0, // Hide points for better performance
            pointHoverRadius: 4
        };
    });
    
    behaviorChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: Array.from({length: simulationData.maxHistorySize || 100}, (_, i) => `T${i}`),
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 0 // Disable animations for better performance
            },
            interaction: {
                intersect: false,
                mode: 'index'
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100
                },
                x: {
                    display: true
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom',
                    labels: {
                        boxWidth: 12,
                        padding: 10
                    }
                },
                tooltip: {
                    enabled: true,
                    mode: 'index',
                    intersect: false
                }
            },
            elements: {
                line: {
                    tension: 0.4
                }
            }
        }
    });
}

// Optimized behavior chart update
function updateBehaviorChart() {
    if (!behaviorChart || !simulationData.variables) return;
    
    // Batch update all datasets at once
    const updateData = {};
    Object.keys(simulationData.variables).forEach(key => {
        const variable = simulationData.variables[key];
        updateData[key] = [...variable.history]; // Create copy to avoid reference issues
    });
    
    // Update datasets efficiently
    behaviorChart.data.datasets.forEach((dataset, index) => {
        const variableKey = Object.keys(simulationData.variables)[index];
        if (updateData[variableKey]) {
            dataset.data = updateData[variableKey];
        }
    });
    
    // Update chart without animation for performance
    behaviorChart.update('none');
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

// Update simulation speed with performance monitoring
function updateSimulationSpeed(value) {
    simulationSpeed = parseInt(value);
    document.getElementById('speedValue').textContent = `${value}x`;
    
    // Log performance impact
    if (performanceMetrics.avgFrameTime > 20) {
        console.warn('High frame time detected:', performanceMetrics.avgFrameTime);
    }
}

// Performance monitoring function
function getPerformanceMetrics() {
    return {
        ...performanceMetrics,
        currentFPS: performanceMetrics.avgFrameTime > 0 ? Math.round(1000 / performanceMetrics.avgFrameTime) : 0,
        memoryUsage: performance.memory ? {
            used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024) + ' MB',
            total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024) + ' MB'
        } : 'N/A'
    };
}

// Log performance metrics periodically
setInterval(() => {
    if (simulationRunning) {
        const metrics = getPerformanceMetrics();
        console.log('Performance Metrics:', metrics);
    }
}, 5000);

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

// Create 3D diagram with performance optimizations
function create3DDiagram() {
    const container = document.getElementById('causalDiagram');
    container.innerHTML = ''; // Clear 2D content
    
    // Three.js setup with performance optimizations
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf8fafc);
    
    const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(0, 0, 500);
    
    const renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance'
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Limit pixel ratio for performance
    container.appendChild(renderer.domElement);
    
    // Optimized lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.4);
    directionalLight.position.set(100, 100, 50);
    scene.add(directionalLight);
    
    // Create 3D nodes with optimizations
    const nodes = [];
    const edges = [];
    const nodeData = [];
    
    if (currentProblem) {
        // Add problem node (center)
        const problemGeometry = new THREE.BoxGeometry(60, 40, 20);
        const problemMaterial = new THREE.MeshPhongMaterial({ 
            color: 0xef4444,
            flatShading: true // Better performance
        });
        const problemMesh = new THREE.Mesh(problemGeometry, problemMaterial);
        problemMesh.position.set(0, 0, 0);
        problemMesh.castShadow = true;
        problemMesh.receiveShadow = true;
        scene.add(problemMesh);
        nodes.push(problemMesh);
        nodeData.push({ mesh: problemMesh, baseY: 0, phase: 0 });
        
        // Add cause nodes
        (currentProblem.causes || []).forEach((cause, index) => {
            const angle = (index * 2 * Math.PI) / (currentProblem.causes.length || 1);
            const radius = 150;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            
            const geometry = new THREE.SphereGeometry(25, 16, 12); // Reduced segments for performance
            const color = cause.type === 'primary' ? 0xdc2626 : cause.type === 'secondary' ? 0xf59e0b : 0x6b7280;
            const material = new THREE.MeshPhongMaterial({ 
                color: color,
                flatShading: true
            });
            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.set(x, y, -50);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            scene.add(mesh);
            nodes.push(mesh);
            nodeData.push({ mesh: mesh, baseY: y, baseZ: -50, phase: index * 0.5 });
            
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
            
            const geometry = new THREE.SphereGeometry(25, 16, 12); // Reduced segments
            const color = impact.type === 'technical' ? 0x2563eb : impact.type === 'business' ? 0x059669 : 0x7c3aed;
            const material = new THREE.MeshPhongMaterial({ 
                color: color,
                flatShading: true
            });
            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.set(x, y, 50);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            scene.add(mesh);
            nodes.push(mesh);
            nodeData.push({ mesh: mesh, baseY: y, baseZ: 50, phase: index * 0.5 + Math.PI });
            
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
    
    // Performance-optimized animation loop
    let animationId;
    let lastTime = 0;
    const targetFPS = 30; // Reduced FPS for better performance
    
    function animate(currentTime) {
        animationId = requestAnimationFrame(animate);
        
        // Frame rate limiting
        if (currentTime - lastTime < 1000 / targetFPS) {
            return;
        }
        lastTime = currentTime;
        
        // Optimized node animations
        const time = currentTime * 0.001;
        nodeData.forEach((nodeData, index) => {
            const mesh = nodeData.mesh;
            
            // Rotation
            mesh.rotation.y += 0.005;
            
            // Floating animation with reduced calculations
            const floatOffset = Math.sin(time + nodeData.phase) * 5;
            mesh.position.z = nodeData.baseZ + floatOffset;
        });
        
        renderer.render(scene, camera);
    }
    
    animate(0);
    
    // Optimized mouse controls with throttling
    let mouseX = 0, mouseY = 0;
    let lastMouseMove = 0;
    
    container.addEventListener('mousemove', (event) => {
        const now = Date.now();
        if (now - lastMouseMove < 16) return; // Throttle to ~60fps
        
        const rect = container.getBoundingClientRect();
        mouseX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouseY = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        camera.position.x = mouseX * 50;
        camera.position.y = mouseY * 50;
        camera.lookAt(0, 0, 0);
        
        lastMouseMove = now;
    });
    
    // Clean up function
    container.cleanup = () => {
        if (animationId) {
            cancelAnimationFrame(animationId);
        }
        renderer.dispose();
        nodes.forEach(node => {
            node.geometry.dispose();
            node.material.dispose();
        });
        edges.forEach(edge => {
            edge.geometry.dispose();
            edge.material.dispose();
        });
    };
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

// ==================== AI-POWERED ANALYSIS ====================

// Toggle AI Analysis panel
function toggleAIAnalysis() {
    const btn = document.getElementById('aiAnalysisBtn');
    const panel = document.getElementById('aiAnalysisPanel');
    
    if (aiAnalysisActive) {
        aiAnalysisActive = false;
        panel.classList.add('hidden');
        btn.innerHTML = '<i class="fas fa-brain mr-2"></i>AI Analysis';
        btn.className = 'bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition';
    } else {
        aiAnalysisActive = true;
        panel.classList.remove('hidden');
        btn.innerHTML = '<i class="fas fa-brain-slash mr-2"></i>Close AI';
        btn.className = 'bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition';
    }
}

// Toggle NLP Input section
function toggleNLPInput() {
    const section = document.getElementById('nlpInputSection');
    section.classList.toggle('hidden');
}

// Run comprehensive AI analysis
function runAIAnalysis() {
    if (!currentProblem) {
        showError('Please load a problem first');
        return;
    }
    
    showSuccess('Running AI analysis...');
    
    // Simulate AI processing with progressive updates
    setTimeout(() => {
        detectFeedbackLoops();
        updateAIConfidence(25);
    }, 500);
    
    setTimeout(() => {
        identifySystemArchetype();
        updateAIConfidence(50);
    }, 1000);
    
    setTimeout(() => {
        generateSmartRecommendations();
        updateAIConfidence(75);
    }, 1500);
    
    setTimeout(() => {
        updateAIConfidence(95);
        showSuccess('AI analysis completed!');
    }, 2000);
}

// Intelligent Loop Detection
function detectFeedbackLoops() {
    const detectedLoopsDiv = document.getElementById('detectedLoops');
    detectedLoopsDiv.innerHTML = '';
    
    const loops = [];
    
    // Analyze existing causes and impacts to find potential loops
    if (currentProblem.causes && currentProblem.impacts) {
        // Look for reinforcing patterns
        const growthWords = ['increase', 'growth', 'expand', 'multiply', 'accelerate', 'compound'];
        const declineWords = ['decrease', 'reduce', 'decline', 'shrink', 'contract', 'diminish'];
        
        // Check for growth loops
        const growthCauses = currentProblem.causes.filter(cause => 
            growthWords.some(word => cause.description.toLowerCase().includes(word))
        );
        
        if (growthCauses.length > 0) {
            loops.push({
                type: 'reinforcing',
                description: 'Growth Reinforcing Loop',
                confidence: 0.85,
                variables: growthCauses.map(c => c.description)
            });
        }
        
        // Check for balancing patterns
        const balanceWords = ['balance', 'stabilize', 'regulate', 'control', 'maintain', 'equilibrium'];
        const balanceCauses = currentProblem.causes.filter(cause => 
            balanceWords.some(word => cause.description.toLowerCase().includes(word))
        );
        
        if (balanceCauses.length > 0) {
            loops.push({
                type: 'balancing',
                description: 'Balancing Loop',
                confidence: 0.75,
                variables: balanceCauses.map(c => c.description)
            });
        }
        
        // Detect delay patterns
        const delayWords = ['delay', 'lag', 'wait', 'postpone', 'defer'];
        const delayCauses = currentProblem.causes.filter(cause => 
            delayWords.some(word => cause.description.toLowerCase().includes(word))
        );
        
        if (delayCauses.length > 0) {
            loops.push({
                type: 'delay',
                description: 'Delay Loop',
                confidence: 0.70,
                variables: delayCauses.map(c => c.description)
            });
        }
    }
    
    // Display detected loops
    if (loops.length > 0) {
        loops.forEach(loop => {
            const loopDiv = document.createElement('div');
            loopDiv.className = `p-2 rounded ${loop.type === 'reinforcing' ? 'bg-green-100' : loop.type === 'balancing' ? 'bg-yellow-100' : 'bg-orange-100'}`;
            loopDiv.innerHTML = `
                <div class="font-medium text-sm">${loop.description}</div>
                <div class="text-xs text-gray-600">Type: ${loop.type} | Confidence: ${(loop.confidence * 100).toFixed(0)}%</div>
                <div class="text-xs text-gray-500 mt-1">Variables: ${loop.variables.slice(0, 2).join(', ')}${loop.variables.length > 2 ? '...' : ''}</div>
            `;
            detectedLoopsDiv.appendChild(loopDiv);
        });
    } else {
        detectedLoopsDiv.innerHTML = '<div class="text-sm text-gray-600">No clear feedback loops detected</div>';
    }
}

// Pattern Recognition for System Archetypes
function identifySystemArchetype() {
    const archetypeDiv = document.getElementById('systemArchetype');
    archetypeDiv.innerHTML = '';
    
    const archetypes = [
        {
            name: 'Limits to Growth',
            description: 'Growth process encounters limits that slow it down',
            indicators: ['growth', 'limit', 'constraint', 'capacity', 'saturation'],
            confidence: 0
        },
        {
            name: 'Tragedy of the Commons',
            description: 'Individual rational actions lead to collective disaster',
            indicators: ['shared', 'resource', 'overuse', 'depletion', 'competition'],
            confidence: 0
        },
        {
            name: 'Success to the Successful',
            description: 'Resources allocated to those already successful',
            indicators: ['rich', 'poor', 'inequality', 'advantage', 'disadvantage'],
            confidence: 0
        },
        {
            name: 'Escalation',
            description: 'Competitive actions lead to increasing intensity',
            indicators: ['compete', 'escalate', 'arms race', 'conflict', 'tension'],
            confidence: 0
        },
        {
            name: 'Fixes that Fail',
            description: 'Solutions make the problem worse over time',
            indicators: ['fix', 'solution', 'worsen', 'side effect', 'unintended'],
            confidence: 0
        }
    ];
    
    // Analyze problem text for archetype indicators
    const problemText = `${currentProblem.title} ${currentProblem.description} ${(currentProblem.causes || []).map(c => c.description).join(' ')} ${(currentProblem.impacts || []).map(i => i.description).join(' ')}`.toLowerCase();
    
    archetypes.forEach(archetype => {
        archetype.confidence = archetype.indicators.filter(indicator => 
            problemText.includes(indicator)
        ).length / archetype.indicators.length;
    });
    
    // Sort by confidence and display top matches
    archetypes.sort((a, b) => b.confidence - a.confidence);
    
    const topArchetype = archetypes[0];
    if (topArchetype.confidence > 0.2) {
        const archetypeCard = document.createElement('div');
        archetypeCard.className = 'p-3 bg-white rounded border';
        archetypeCard.innerHTML = `
            <div class="font-medium text-sm">${topArchetype.name}</div>
            <div class="text-xs text-gray-600 mt-1">${topArchetype.description}</div>
            <div class="text-xs text-indigo-600 mt-2">Match: ${(topArchetype.confidence * 100).toFixed(0)}%</div>
        `;
        archetypeDiv.appendChild(archetypeCard);
    } else {
        archetypeDiv.innerHTML = '<div class="text-sm text-gray-600">No clear system archetype identified</div>';
    }
}

// Smart Recommendations
function generateSmartRecommendations() {
    const causesDiv = document.getElementById('suggestedCauses');
    const impactsDiv = document.getElementById('suggestedImpacts');
    
    causesDiv.innerHTML = '';
    impactsDiv.innerHTML = '';
    
    // Cause recommendations based on problem domain
    const causeRecommendations = getCausesByDomain(currentProblem.title, currentProblem.description);
    const impactRecommendations = getImpactsByDomain(currentProblem.title, currentProblem.description);
    
    // Display suggested causes
    causeRecommendations.forEach(cause => {
        const causeDiv = document.createElement('div');
        causeDiv.className = 'flex items-center gap-2 p-2 bg-white rounded border hover:bg-gray-50 cursor-pointer';
        causeDiv.innerHTML = `
            <i class="fas fa-plus text-green-600 text-xs"></i>
            <span class="text-xs">${cause.description}</span>
            <span class="text-xs text-gray-500">${cause.type}</span>
        `;
        causeDiv.onclick = () => addSuggestedCause(cause);
        causesDiv.appendChild(causeDiv);
    });
    
    // Display suggested impacts
    impactRecommendations.forEach(impact => {
        const impactDiv = document.createElement('div');
        impactDiv.className = 'flex items-center gap-2 p-2 bg-white rounded border hover:bg-gray-50 cursor-pointer';
        impactDiv.innerHTML = `
            <i class="fas fa-plus text-blue-600 text-xs"></i>
            <span class="text-xs">${impact.description}</span>
            <span class="text-xs text-gray-500">${impact.type}</span>
        `;
        impactDiv.onclick = () => addSuggestedImpact(impact);
        impactsDiv.appendChild(impactDiv);
    });
}

// Get cause recommendations by domain
function getCausesByDomain(title, description) {
    const text = `${title} ${description}`.toLowerCase();
    
    const domainCauses = {
        business: [
            { description: 'Market competition', type: 'primary' },
            { description: 'Economic conditions', type: 'secondary' },
            { description: 'Customer demand changes', type: 'primary' },
            { description: 'Supply chain disruptions', type: 'secondary' },
            { description: 'Regulatory changes', type: 'latent' }
        ],
        healthcare: [
            { description: 'Patient volume', type: 'primary' },
            { description: 'Staff shortages', type: 'primary' },
            { description: 'Budget constraints', type: 'secondary' },
            { description: 'Technology limitations', type: 'secondary' },
            { description: 'Policy changes', type: 'latent' }
        ],
        education: [
            { description: 'Student engagement', type: 'primary' },
            { description: 'Teacher workload', type: 'primary' },
            { description: 'Resource availability', type: 'secondary' },
            { description: 'Curriculum changes', type: 'secondary' },
            { description: 'Socioeconomic factors', type: 'latent' }
        ],
        technology: [
            { description: 'Technical debt', type: 'primary' },
            { description: 'System complexity', type: 'primary' },
            { description: 'Skill gaps', type: 'secondary' },
            { description: 'Budget limitations', type: 'secondary' },
            { description: 'Rapid technology changes', type: 'latent' }
        ],
        environment: [
            { description: 'Climate change', type: 'primary' },
            { description: 'Resource depletion', type: 'primary' },
            { description: 'Pollution levels', type: 'secondary' },
            { description: 'Policy enforcement', type: 'secondary' },
            { description: 'Global economic factors', type: 'latent' }
        ]
    };
    
    // Determine domain based on keywords
    let domain = 'business'; // default
    if (text.includes('health') || text.includes('patient') || text.includes('medical')) domain = 'healthcare';
    else if (text.includes('education') || text.includes('student') || text.includes('teacher')) domain = 'education';
    else if (text.includes('technology') || text.includes('software') || text.includes('system')) domain = 'technology';
    else if (text.includes('environment') || text.includes('climate') || text.includes('pollution')) domain = 'environment';
    
    return domainCauses[domain] || domainCauses.business;
}

// Get impact recommendations by domain
function getImpactsByDomain(title, description) {
    const text = `${title} ${description}`.toLowerCase();
    
    const domainImpacts = {
        business: [
            { description: 'Revenue decline', type: 'business' },
            { description: 'Customer satisfaction', type: 'business' },
            { description: 'Employee turnover', type: 'operational' },
            { description: 'Market share loss', type: 'business' },
            { description: 'Operational efficiency', type: 'operational' }
        ],
        healthcare: [
            { description: 'Patient outcomes', type: 'health' },
            { description: 'Staff burnout', type: 'operational' },
            { description: 'Care quality', type: 'health' },
            { description: 'Wait times', type: 'operational' },
            { description: 'Cost increases', type: 'business' }
        ],
        education: [
            { description: 'Student performance', type: 'educational' },
            { description: 'Teacher retention', type: 'operational' },
            { description: 'Learning outcomes', type: 'educational' },
            { description: 'Graduation rates', type: 'educational' },
            { description: 'Resource utilization', type: 'operational' }
        ],
        technology: [
            { description: 'System reliability', type: 'technical' },
            { description: 'User experience', type: 'technical' },
            { description: 'Development velocity', type: 'operational' },
            { description: 'Security vulnerabilities', type: 'technical' },
            { description: 'Maintenance costs', type: 'business' }
        ],
        environment: [
            { description: 'Ecosystem damage', type: 'environmental' },
            { description: 'Public health', type: 'health' },
            { description: 'Economic impact', type: 'business' },
            { description: 'Biodiversity loss', type: 'environmental' },
            { description: 'Community displacement', type: 'operational' }
        ]
    };
    
    // Determine domain based on keywords
    let domain = 'business'; // default
    if (text.includes('health') || text.includes('patient') || text.includes('medical')) domain = 'healthcare';
    else if (text.includes('education') || text.includes('student') || text.includes('teacher')) domain = 'education';
    else if (text.includes('technology') || text.includes('software') || text.includes('system')) domain = 'technology';
    else if (text.includes('environment') || text.includes('climate') || text.includes('pollution')) domain = 'environment';
    
    return domainImpacts[domain] || domainImpacts.business;
}

// Add suggested cause to current problem
function addSuggestedCause(cause) {
    if (!currentProblem.causes) currentProblem.causes = [];
    currentProblem.causes.push(cause);
    displayCauses(currentProblem.causes);
    showSuccess(`Added cause: ${cause.description}`);
}

// Add suggested impact to current problem
function addSuggestedImpact(impact) {
    if (!currentProblem.impacts) currentProblem.impacts = [];
    currentProblem.impacts.push(impact);
    displayImpacts(currentProblem.impacts);
    showSuccess(`Added impact: ${impact.description}`);
}

// Natural Language Processing for problem description
function processNLPInput() {
    const input = document.getElementById('nlpTextInput').value.trim();
    if (!input) {
        showError('Please enter a problem description');
        return;
    }
    
    showSuccess('Processing natural language input...');
    
    // Simulate NLP processing
    setTimeout(() => {
        const extractedData = analyzeText(input);
        
        // Create new problem from extracted data
        const newProblem = {
            title: extractedData.title,
            description: input,
            causes: extractedData.causes,
            impacts: extractedData.impacts,
            feedback_loops: extractedData.feedback_loops,
            remediations: []
        };
        
        // Load the generated problem
        currentProblem = newProblem;
        document.getElementById('detailsSection').classList.remove('hidden');
        document.getElementById('diagramSection').classList.remove('hidden');
        document.getElementById('problemTitle').textContent = newProblem.title;
        displayCauses(newProblem.causes || []);
        displayImpacts(newProblem.impacts || []);
        displayLoops(newProblem.feedback_loops || []);
        displayRemediations(newProblem.remediations || []);
        createCausalDiagram(newProblem);
        
        // Clear NLP input
        document.getElementById('nlpTextInput').value = '';
        document.getElementById('nlpInputSection').classList.add('hidden');
        
        showSuccess('Diagram generated from natural language input!');
    }, 1500);
}

// Analyze text and extract causal relationships
function analyzeText(text) {
    const lowerText = text.toLowerCase();
    
    // Extract title (first sentence or key phrase)
    const sentences = text.split(/[.!?]+/);
    const title = sentences[0].trim() || 'Generated Problem';
    
    // Extract causes (look for cause indicators)
    const causeIndicators = ['because', 'due to', 'caused by', 'result of', 'since', 'as', 'given'];
    const causes = [];
    
    causeIndicators.forEach(indicator => {
        const regex = new RegExp(`${indicator}\\s+([^,.!?]+)`, 'gi');
        let match;
        while ((match = regex.exec(text)) !== null) {
            const cause = match[1].trim();
            if (cause.length > 5) {
                causes.push({
                    description: cause.charAt(0).toUpperCase() + cause.slice(1),
                    type: 'primary'
                });
            }
        }
    });
    
    // Extract impacts (look for effect indicators)
    const impactIndicators = ['leads to', 'results in', 'causes', 'creates', 'produces'];
    const impacts = [];
    
    impactIndicators.forEach(indicator => {
        const regex = new RegExp(`([^,.!?]+)\\s+${indicator}\\s+([^,.!?]+)`, 'gi');
        let match;
        while ((match = regex.exec(text)) !== null) {
            const impact = match[2].trim();
            if (impact.length > 5) {
                impacts.push({
                    description: impact.charAt(0).toUpperCase() + impact.slice(1),
                    type: 'operational'
                });
            }
        }
    });
    
    // Generate feedback loops based on patterns
    const feedback_loops = [];
    if (lowerText.includes('cycle') || lowerText.includes('vicious') || lowerText.includes('virtuous')) {
        feedback_loops.push({
            description: 'Detected cyclical pattern',
            type: lowerText.includes('vicious') ? 'reinforcing' : 'balancing',
            relationships: []
        });
    }
    
    return {
        title: title,
        causes: causes.slice(0, 5), // Limit to 5 causes
        impacts: impacts.slice(0, 5), // Limit to 5 impacts
        feedback_loops: feedback_loops
    };
}

// Update AI confidence score
function updateAIConfidence(confidence) {
    const bar = document.getElementById('aiConfidenceBar');
    const text = document.getElementById('aiConfidenceText');
    
    bar.style.width = `${confidence}%`;
    text.textContent = `${confidence}%`;
    
    // Change color based on confidence level
    if (confidence >= 80) {
        bar.className = 'bg-green-600 h-2 rounded-full transition-all duration-500';
    } else if (confidence >= 60) {
        bar.className = 'bg-yellow-600 h-2 rounded-full transition-all duration-500';
    } else {
        bar.className = 'bg-red-600 h-2 rounded-full transition-all duration-500';
    }
}

// ==================== TEMPLATE LIBRARY ====================

// Template data structure
const templates = {
    // Industry-specific templates
    'healthcare-patient-flow': {
        title: 'Healthcare Patient Flow',
        description: 'Analysis of patient journey through healthcare system',
        causes: [
            { description: 'Patient volume increase', type: 'primary' },
            { description: 'Limited staff availability', type: 'primary' },
            { description: 'Complex insurance processes', type: 'secondary' },
            { description: 'Aging population', type: 'latent' },
            { description: 'Facility capacity constraints', type: 'secondary' }
        ],
        impacts: [
            { description: 'Longer wait times', type: 'operational' },
            { description: 'Decreased patient satisfaction', type: 'health' },
            { description: 'Staff burnout', type: 'operational' },
            { description: 'Increased healthcare costs', type: 'business' },
            { description: 'Reduced quality of care', type: 'health' }
        ],
        feedback_loops: [
            {
                description: 'Staff Burnout Cycle',
                type: 'reinforcing',
                relationships: ['High patient volume → Staff burnout → Reduced staff capacity → Longer wait times']
            },
            {
                description: 'Quality Control Loop',
                type: 'balancing',
                relationships: ['Decreased quality → Increased oversight → Improved processes → Better outcomes']
            }
        ],
        remediations: [
            { description: 'Implement triage systems', type: 'short-term' },
            { description: 'Hire additional staff', type: 'long-term' },
            { description: 'Process automation', type: 'preventive' }
        ]
    },
    
    'it-software-development': {
        title: 'IT Software Development',
        description: 'Managing technical debt and delivery velocity',
        causes: [
            { description: 'Rapid feature requirements', type: 'primary' },
            { description: 'Technical debt accumulation', type: 'primary' },
            { description: 'Limited testing resources', type: 'secondary' },
            { description: 'Skill gaps in team', type: 'latent' },
            { description: 'Pressure to deliver quickly', type: 'secondary' }
        ],
        impacts: [
            { description: 'Decreased code quality', type: 'technical' },
            { description: 'Slower development velocity', type: 'operational' },
            { description: 'Increased bug count', type: 'technical' },
            { description: 'Team frustration', type: 'operational' },
            { description: 'Customer satisfaction decline', type: 'business' }
        ],
        feedback_loops: [
            {
                description: 'Technical Debt Spiral',
                type: 'reinforcing',
                relationships: ['Technical debt → Slower development → More shortcuts → More technical debt']
            },
            {
                description: 'Quality Feedback Loop',
                type: 'balancing',
                relationships: ['Low quality → Increased testing → Better code → Improved quality']
            }
        ],
        remediations: [
            { description: 'Allocate time for refactoring', type: 'short-term' },
            { description: 'Implement comprehensive testing', type: 'long-term' },
            { description: 'Adopt clean code practices', type: 'preventive' }
        ]
    },
    
    'manufacturing-supply-chain': {
        title: 'Manufacturing Supply Chain',
        description: 'Optimizing production and distribution networks',
        causes: [
            { description: 'Demand volatility', type: 'primary' },
            { description: 'Supplier reliability issues', type: 'primary' },
            { description: 'Inventory management challenges', type: 'secondary' },
            { description: 'Transportation disruptions', type: 'latent' },
            { description: 'Quality control problems', type: 'secondary' }
        ],
        impacts: [
            { description: 'Stockouts', type: 'operational' },
            { description: 'Excess inventory costs', type: 'business' },
            { description: 'Production delays', type: 'operational' },
            { description: 'Customer dissatisfaction', type: 'business' },
            { description: 'Increased operational costs', type: 'business' }
        ],
        feedback_loops: [
            {
                description: 'Bullwhip Effect',
                type: 'reinforcing',
                relationships: ['Demand variability → Order fluctuations → Inventory swings → More variability']
            },
            {
                description: 'Inventory Balancing',
                type: 'balancing',
                relationships: ['High inventory → Cost pressure → Reduction efforts → Optimal levels']
            }
        ],
        remediations: [
            { description: 'Implement demand forecasting', type: 'short-term' },
            { description: 'Diversify supplier base', type: 'long-term' },
            { description: 'Adopt just-in-time inventory', type: 'preventive' }
        ]
    },
    
    'education-student-success': {
        title: 'Education Student Success',
        description: 'Improving learning outcomes and retention',
        causes: [
            { description: 'Large class sizes', type: 'primary' },
            { description: 'Limited resources', type: 'primary' },
            { description: 'Teacher workload', type: 'secondary' },
            { description: 'Socioeconomic factors', type: 'latent' },
            { description: 'Outdated teaching methods', type: 'secondary' }
        ],
        impacts: [
            { description: 'Lower academic performance', type: 'educational' },
            { description: 'Decreased student engagement', type: 'educational' },
            { description: 'Higher dropout rates', type: 'educational' },
            { description: 'Teacher burnout', type: 'operational' },
            { description: 'Reduced institutional reputation', type: 'business' }
        ],
        feedback_loops: [
            {
                description: 'Success Breeds Success',
                type: 'reinforcing',
                relationships: ['Student success → Increased confidence → Better performance → More success']
            },
            {
                description: 'Resource Allocation',
                type: 'balancing',
                relationships: ['Poor performance → Additional resources → Improved support → Better outcomes']
            }
        ],
        remediations: [
            { description: 'Reduce class sizes', type: 'short-term' },
            { description: 'Invest in teacher training', type: 'long-term' },
            { description: 'Update curriculum and methods', type: 'preventive' }
        ]
    },
    
    // Problem-type templates
    'project-delays': {
        title: 'Project Delays',
        description: 'Analyzing and preventing schedule slips',
        causes: [
            { description: 'Unrealistic timelines', type: 'primary' },
            { description: 'Scope creep', type: 'primary' },
            { description: 'Resource constraints', type: 'secondary' },
            { description: 'Poor planning', type: 'latent' },
            { description: 'External dependencies', type: 'secondary' }
        ],
        impacts: [
            { description: 'Budget overruns', type: 'business' },
            { description: 'Team burnout', type: 'operational' },
            { description: 'Stakeholder dissatisfaction', type: 'business' },
            { description: 'Quality compromises', type: 'technical' },
            { description: 'Reputational damage', type: 'business' }
        ],
        feedback_loops: [
            {
                description: 'Death March',
                type: 'reinforcing',
                relationships: ['Delays → Pressure → Cutting corners → More problems → More delays']
            }
        ],
        remediations: [
            { description: 'Rebaseline project schedule', type: 'short-term' },
            { description: 'Implement agile methodology', type: 'long-term' },
            { description: 'Better risk assessment', type: 'preventive' }
        ]
    },
    
    'budget-overruns': {
        title: 'Budget Overruns',
        description: 'Managing cost escalations and financial controls',
        causes: [
            { description: 'Poor cost estimation', type: 'primary' },
            { description: 'Scope changes', type: 'primary' },
            { description: 'Inefficient resource use', type: 'secondary' },
            { description: 'Market inflation', type: 'latent' },
            { description: 'Inadequate monitoring', type: 'secondary' }
        ],
        impacts: [
            { description: 'Reduced profitability', type: 'business' },
            { description: 'Cash flow problems', type: 'business' },
            { description: 'Stakeholder concerns', type: 'business' },
            { description: 'Project cancellation risk', type: 'business' },
            { description: 'Team morale decline', type: 'operational' }
        ],
        feedback_loops: [
            {
                description: 'Cost Escalation',
                type: 'reinforcing',
                relationships: ['Budget pressure → Rushed decisions → Poor quality → Rework → Higher costs']
            }
        ],
        remediations: [
            { description: 'Implement cost controls', type: 'short-term' },
            { description: 'Regular budget reviews', type: 'long-term' },
            { description: 'Contingency planning', type: 'preventive' }
        ]
    },
    
    // System archetype templates
    'limits-to-growth': {
        title: 'Limits to Growth',
        description: 'Growth process encounters limiting factors',
        causes: [
            { description: 'Growth actions', type: 'primary' },
            { description: 'Increasing performance', type: 'primary' },
            { description: 'Resource consumption', type: 'secondary' },
            { description: 'Waste generation', type: 'secondary' },
            { description: 'System constraints', type: 'latent' }
        ],
        impacts: [
            { description: 'Improved performance', type: 'business' },
            { description: 'Resource depletion', type: 'operational' },
            { description: 'Slowing growth', type: 'business' },
            { description: 'System stress', type: 'operational' },
            { description: 'Diminishing returns', type: 'business' }
        ],
        feedback_loops: [
            {
                description: 'Growth Loop',
                type: 'reinforcing',
                relationships: ['Growth actions → Better performance → More growth actions']
            },
            {
                description: 'Limits Loop',
                type: 'balancing',
                relationships: ['Growth → Resource use → Constraints → Slower growth']
            }
        ],
        remediations: [
            { description: 'Remove constraints', type: 'short-term' },
            { description: 'Find new resources', type: 'long-term' },
            { description: 'Sustainable practices', type: 'preventive' }
        ]
    },
    
    'tragedy-of-commons': {
        title: 'Tragedy of the Commons',
        description: 'Individual rational actions leading to collective disaster',
        causes: [
            { description: 'Individual resource use', type: 'primary' },
            { description: 'Personal benefit focus', type: 'primary' },
            { description: 'Shared resource access', type: 'secondary' },
            { description: 'Lack of regulation', type: 'latent' },
            { description: 'Short-term thinking', type: 'secondary' }
        ],
        impacts: [
            { description: 'Resource depletion', type: 'environmental' },
            { description: 'System collapse', type: 'environmental' },
            { description: 'Individual suffering', type: 'health' },
            { description: 'Economic loss', type: 'business' },
            { description: 'Social conflict', type: 'operational' }
        ],
        feedback_loops: [
            {
                description: 'Depletion Spiral',
                type: 'reinforcing',
                relationships: ['Resource use → Depletion → Competition → More intensive use']
            }
        ],
        remediations: [
            { description: 'Implement regulations', type: 'short-term' },
            { description: 'Create resource management', type: 'long-term' },
            { description: 'Education and awareness', type: 'preventive' }
        ]
    }
};

// Show template category
function showTemplateCategory(category) {
    // Hide all categories
    document.querySelectorAll('.template-category').forEach(cat => {
        cat.classList.add('hidden');
    });
    
    // Show selected category
    document.getElementById(`${category}Templates`).classList.remove('hidden');
    
    // Update tab styling
    document.querySelectorAll('.template-tab').forEach(tab => {
        tab.className = tab.className.replace(/bg-\w+-600/, 'bg-gray-400');
    });
    event.target.className = event.target.className.replace('bg-gray-400', 
        category === 'industry' ? 'bg-purple-600' :
        category === 'problem' ? 'bg-blue-600' :
        category === 'archetype' ? 'bg-green-600' : 'bg-gray-600'
    );
}

// Load template
function loadTemplate(templateId) {
    const template = templates[templateId];
    if (!template) {
        showError('Template not found');
        return;
    }
    
    // Create problem from template
    currentProblem = {
        id: `template_${templateId}_${Date.now()}`,
        title: template.title,
        description: template.description,
        causes: [...template.causes],
        impacts: [...template.impacts],
        feedback_loops: [...template.feedback_loops],
        remediations: [...template.remediations]
    };
    
    // Show sections and display data
    document.getElementById('detailsSection').classList.remove('hidden');
    document.getElementById('diagramSection').classList.remove('hidden');
    document.getElementById('problemTitle').textContent = currentProblem.title;
    
    displayCauses(currentProblem.causes);
    displayImpacts(currentProblem.impacts);
    displayLoops(currentProblem.feedback_loops);
    displayRemediations(currentProblem.remediations);
    createCausalDiagram(currentProblem);
    
    showSuccess(`Template "${template.title}" loaded successfully!`);
    
    // Scroll to details
    document.getElementById('detailsSection').scrollIntoView({ behavior: 'smooth' });
}

// Save current problem as template
function saveAsTemplate() {
    if (!currentProblem) {
        showError('No problem to save as template');
        return;
    }
    
    const templateName = prompt('Enter a name for your custom template:');
    if (!templateName) return;
    
    const template = {
        name: templateName,
        title: currentProblem.title,
        description: currentProblem.description,
        causes: [...(currentProblem.causes || [])],
        impacts: [...(currentProblem.impacts || [])],
        feedback_loops: [...(currentProblem.feedback_loops || [])],
        remediations: [...(currentProblem.remediations || [])],
        created: new Date().toISOString()
    };
    
    // Save to local storage
    customTemplates.push(template);
    localStorage.setItem('customTemplates', JSON.stringify(customTemplates));
    
    // Refresh custom templates display
    displayCustomTemplates();
    
    showSuccess(`Template "${templateName}" saved successfully!`);
}

// Display custom templates
function displayCustomTemplates() {
    const container = document.getElementById('customTemplatesList');
    
    if (customTemplates.length === 0) {
        container.innerHTML = `
            <div class="text-center text-gray-500 py-8 col-span-full">
                <i class="fas fa-folder-open text-4xl mb-3"></i>
                <p>No custom templates yet. Create and save your own templates for reuse!</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = '';
    
    customTemplates.forEach((template, index) => {
        const templateCard = document.createElement('div');
        templateCard.className = 'template-card bg-gradient-to-br from-gray-50 to-slate-50 p-4 rounded-lg border border-gray-200 hover:shadow-lg transition cursor-pointer';
        templateCard.innerHTML = `
            <div class="flex justify-between items-start mb-2">
                <div class="flex items-center">
                    <i class="fas fa-file-alt text-gray-600 text-xl mr-3"></i>
                    <h4 class="font-semibold text-gray-800">${template.name}</h4>
                </div>
                <button onclick="deleteCustomTemplate(${index})" class="text-red-500 hover:text-red-700">
                    <i class="fas fa-trash text-sm"></i>
                </button>
            </div>
            <p class="text-sm text-gray-600 mb-3">${template.title}</p>
            <div class="text-xs text-gray-500">
                Created: ${new Date(template.created).toLocaleDateString()}
            </div>
        `;
        
        templateCard.onclick = (e) => {
            if (!e.target.closest('button')) {
                loadCustomTemplate(index);
            }
        };
        
        container.appendChild(templateCard);
    });
}

// Load custom template
function loadCustomTemplate(index) {
    const template = customTemplates[index];
    if (!template) return;
    
    currentProblem = {
        id: `custom_${index}_${Date.now()}`,
        title: template.title,
        description: template.description,
        causes: [...template.causes],
        impacts: [...template.impacts],
        feedback_loops: [...template.feedback_loops],
        remediations: [...template.remediations]
    };
    
    // Show sections and display data
    document.getElementById('detailsSection').classList.remove('hidden');
    document.getElementById('diagramSection').classList.remove('hidden');
    document.getElementById('problemTitle').textContent = currentProblem.title;
    
    displayCauses(currentProblem.causes);
    displayImpacts(currentProblem.impacts);
    displayLoops(currentProblem.feedback_loops);
    displayRemediations(currentProblem.remediations);
    createCausalDiagram(currentProblem);
    
    showSuccess(`Custom template "${template.name}" loaded successfully!`);
    
    // Scroll to details
    document.getElementById('detailsSection').scrollIntoView({ behavior: 'smooth' });
}

// Delete custom template
function deleteCustomTemplate(index) {
    if (confirm('Are you sure you want to delete this template?')) {
        customTemplates.splice(index, 1);
        localStorage.setItem('customTemplates', JSON.stringify(customTemplates));
        displayCustomTemplates();
        showSuccess('Template deleted successfully!');
    }
}

// Load custom templates from localStorage
function loadCustomTemplates() {
    const stored = localStorage.getItem('customTemplates');
    if (stored) {
        try {
            customTemplates = JSON.parse(stored);
        } catch (e) {
            customTemplates = [];
        }
    }
    displayCustomTemplates();
}

// Initialize custom templates on load
document.addEventListener('DOMContentLoaded', function() {
    loadProblems();
    loadCustomTemplates();
});

// ML and Predictive Analytics Functions

// Train ML models
async function trainMLModels() {
    try {
        showNotification('Training ML models...', 'info');
        
        const response = await fetch('/api/ml/train-patterns', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const result = await response.json();
        
        if (result.error) {
            showNotification(`Training failed: ${result.error}`, 'error');
        } else {
            showNotification('ML models trained successfully!', 'success');
        }
    } catch (error) {
        console.error('Error training ML models:', error);
        showNotification('Failed to train ML models', 'error');
    }
}

// Train predictive models
async function trainPredictiveModels() {
    try {
        showNotification('Training predictive models...', 'info');
        
        const response = await fetch('/api/predictive/train-models', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const result = await response.json();
        
        if (result.time_series.error && result.impact_predictor.error) {
            showNotification('Failed to train predictive models', 'error');
        } else {
            showNotification('Predictive models trained successfully!', 'success');
        }
    } catch (error) {
        console.error('Error training predictive models:', error);
        showNotification('Failed to train predictive models', 'error');
    }
}

// Predict system archetype
async function predictArchetype(problemId) {
    try {
        const response = await fetch(`/api/ml/predict-archetype/${problemId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const result = await response.json();
        
        if (result.error) {
            showNotification(`Prediction failed: ${result.error}`, 'error');
        } else {
            displayArchetypePrediction(result);
        }
    } catch (error) {
        console.error('Error predicting archetype:', error);
        showNotification('Failed to predict archetype', 'error');
    }
}

// Detect anomalies
async function detectAnomalies() {
    try {
        showNotification('Detecting anomalies...', 'info');
        
        const response = await fetch('/api/ml/detect-anomalies', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const result = await response.json();
        
        if (result.error) {
            showNotification(`Anomaly detection failed: ${result.error}`, 'error');
        } else {
            displayAnomalies(result);
        }
    } catch (error) {
        console.error('Error detecting anomalies:', error);
        showNotification('Failed to detect anomalies', 'error');
    }
}

// Display anomalies
function displayAnomalies(data) {
    const container = document.getElementById('anomalyResults');
    if (!container) return;
    
    container.innerHTML = `
        <div class="bg-white rounded-lg p-4 border border-gray-200">
            <h4 class="font-semibold text-gray-800 mb-2">Anomaly Detection Results</h4>
            <div class="space-y-2">
                <div class="flex justify-between items-center">
                    <span class="text-sm font-medium">Anomalies Found:</span>
                    <span class="text-sm">${data.anomalies_detected}</span>
                </div>
                <div class="flex justify-between items-center">
                    <span class="text-sm font-medium">Total Analyzed:</span>
                    <span class="text-sm">${data.total_analyzed}</span>
                </div>
                ${data.anomalies.length > 0 ? `
                    <div class="mt-3">
                        <div class="text-sm font-medium mb-2">Anomalous Problems:</div>
                        ${data.anomalies.map(anomaly => `
                            <div class="p-2 bg-red-50 rounded border border-red-200">
                                <div class="text-sm font-medium">${anomaly.title}</div>
                                <div class="text-xs text-gray-500">Anomaly score: ${anomaly.anomaly_score.toFixed(3)}</div>
                            </div>
                        `).join('')}
                    </div>
                ` : '<div class="text-sm text-green-600">No anomalies detected</div>'}
            </div>
        </div>
    `;
}

// Cluster problems
async function clusterProblems() {
    try {
        showNotification('Clustering problems...', 'info');
        
        const response = await fetch('/api/ml/cluster-problems', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const result = await response.json();
        
        if (result.error) {
            showNotification(`Clustering failed: ${result.error}`, 'error');
        } else {
            displayClusters(result);
        }
    } catch (error) {
        console.error('Error clustering problems:', error);
        showNotification('Failed to cluster problems', 'error');
    }
}

// Display clusters
function displayClusters(data) {
    const container = document.getElementById('clusterResults');
    if (!container) return;
    
    container.innerHTML = `
        <div class="bg-white rounded-lg p-4 border border-gray-200">
            <h4 class="font-semibold text-gray-800 mb-2">Problem Clustering Results</h4>
            <div class="space-y-2">
                <div class="flex justify-between items-center">
                    <span class="text-sm font-medium">Number of Clusters:</span>
                    <span class="text-sm">${data.n_clusters}</span>
                </div>
                <div class="flex justify-between items-center">
                    <span class="text-sm font-medium">Silhouette Score:</span>
                    <span class="text-sm">${data.silhouette_score.toFixed(3)}</span>
                </div>
                <div class="mt-3">
                    <div class="text-sm font-medium mb-2">Clusters:</div>
                    ${Object.entries(data.clusters).map(([clusterId, problems]) => `
                        <div class="mb-3">
                            <div class="text-sm font-medium text-blue-600">Cluster ${clusterId} (${problems.length} problems)</div>
                            <div class="ml-4 space-y-1">
                                ${problems.map(problem => `
                                    <div class="text-xs text-gray-600">• ${problem.title}</div>
                                `).join('')}
                            </div>
                        </div>
                    `).join('')}
                </div>
                <div id="clusterVisualization" class="h-64 mt-4"></div>
            </div>
        </div>
    `;
    
    // Create D3 cluster visualization
    if (d3Visualizer) {
        setTimeout(() => {
            d3Visualizer.createClusterVisualization('clusterVisualization', data.clusters);
        }, 100);
    }
}

// Suggest feedback loops
async function suggestLoops(problemId) {
    try {
        const response = await fetch(`/api/ml/suggest-loops/${problemId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const result = await response.json();
        
        if (result.error) {
            showNotification(`Loop suggestion failed: ${result.error}`, 'error');
        } else {
            displayLoopSuggestions(result);
        }
    } catch (error) {
        console.error('Error suggesting loops:', error);
        showNotification('Failed to suggest loops', 'error');
    }
}

// Add suggested loop to current problem
function addSuggestedLoop(index) {
    if (!window.currentLoopSuggestions || !window.currentLoopSuggestions[index]) return;
    
    const suggestion = window.currentLoopSuggestions[index];
    
    if (!currentProblem.feedback_loops) {
        currentProblem.feedback_loops = [];
    }
    
    // Add the suggested loop
    currentProblem.feedback_loops.push({
        description: suggestion.description,
        type: suggestion.type,
        relationships: [suggestion.description]
    });
    
    // Update display
    displayLoops(currentProblem.feedback_loops);
    createCausalDiagram(currentProblem);
    
    showNotification('Suggested loop added!', 'success');
}

// Get trend forecast
async function getForecast(days = 30) {
    try {
        const response = await fetch(`/api/predictive/forecast?days=${days}`);
        const result = await response.json();
        
        if (result.error) {
            showNotification(`Forecast failed: ${result.error}`, 'error');
        } else {
            displayForecast(result);
        }
    } catch (error) {
        console.error('Error getting forecast:', error);
        showNotification('Failed to get forecast', 'error');
    }
}

// Display forecast
function displayForecast(data) {
    const container = document.getElementById('forecastResults');
    if (!container) return;
    
    container.innerHTML = `
        <div class="bg-white rounded-lg p-4 border border-gray-200">
            <h4 class="font-semibold text-gray-800 mb-2">Trend Forecast</h4>
            <div class="space-y-3">
                ${Object.entries(data).map(([metric, forecast]) => `
                    <div>
                        <div class="text-sm font-medium capitalize">${metric.replace('_', ' ')}</div>
                        <div class="text-xs text-gray-500">Trend: ${forecast.current_trend}</div>
                        <div id="forecast-${metric}" class="h-32 mt-2"></div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    
    // Create forecast charts
    Object.entries(data).forEach(([metric, forecast]) => {
        const chartData = forecast.dates.map((date, index) => ({
            date: date,
            value: forecast.predictions[index]
        }));
        
        if (d3Visualizer) {
            setTimeout(() => {
                d3Visualizer.createTimeSeriesChart(`forecast-${metric}`, chartData);
            }, 100);
        }
    });
}

// Predict impacts for current problem
async function predictImpacts(problemId) {
    try {
        const response = await fetch(`/api/predictive/predict-impacts/${problemId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const result = await response.json();
        
        if (result.error) {
            showNotification(`Impact prediction failed: ${result.error}`, 'error');
        } else {
            displayImpactPrediction(result);
        }
    } catch (error) {
        console.error('Error predicting impacts:', error);
        showNotification('Failed to predict impacts', 'error');
    }
}

// Run loop dynamics simulation
async function runSimulation(problemId, timeSteps = 50) {
    try {
        showNotification('Running simulation...', 'info');
        
        const response = await fetch(`/api/predictive/simulate/${problemId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ time_steps: timeSteps })
        });
        
        const result = await response.json();
        
        if (result.error) {
            showNotification(`Simulation failed: ${result.error}`, 'error');
        } else {
            displaySimulationResults(result);
        }
    } catch (error) {
        console.error('Error running simulation:', error);
        showNotification('Failed to run simulation', 'error');
    }
}

// Request real-time analysis
function requestRealTimeAnalysis(problemId) {
    if (socket) {
        socket.emit('request_real_time_analysis', { problem_id: problemId });
        showNotification('Real-time analysis started...', 'info');
    }
}

// Switch to D3 visualization
function switchToD3Visualization() {
    if (!d3Visualizer || !currentProblem) return;
    
    // Hide Vis.js diagram
    const visContainer = document.getElementById('causalDiagram');
    if (visContainer) {
        visContainer.style.display = 'none';
    }
    
    // Show D3 diagram
    const d3Container = document.getElementById('d3Diagram');
    if (d3Container) {
        d3Container.style.display = 'block';
        d3Container.style.height = '400px';
        d3Container.style.border = '1px solid #e5e7eb';
        d3Container.style.borderRadius = '8px';
        
        // Load data and render
        d3Visualizer.loadData(currentProblem);
    }
    
    showNotification('Switched to D3 visualization', 'success');
}

// Switch back to Vis.js visualization
function switchToVisVisualization() {
    // Show Vis.js diagram
    const visContainer = document.getElementById('causalDiagram');
    if (visContainer) {
        visContainer.style.display = 'block';
    }
    
    // Hide D3 diagram
    const d3Container = document.getElementById('d3Diagram');
    if (d3Container) {
        d3Container.style.display = 'none';
    }
    
    showNotification('Switched to Vis.js visualization', 'success');
}

// Export D3 diagram as SVG
function exportD3Diagram() {
    if (d3Visualizer) {
        d3Visualizer.exportAsSVG();
    }
}
