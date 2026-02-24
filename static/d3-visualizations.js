// D3.js Advanced Visualizations for Causal Loop Modeling
class D3CausalLoopVisualizer {
    constructor(containerId) {
        this.container = d3.select(`#${containerId}`);
        this.width = 800;
        this.height = 600;
        this.svg = null;
        this.simulation = null;
        this.nodes = [];
        this.links = [];
        this.colorScale = d3.scaleOrdinal(d3.schemeCategory10);
        
        this.init();
    }
    
    init() {
        // Create SVG container
        this.svg = this.container
            .append('svg')
            .attr('width', this.width)
            .attr('height', this.height);
        
        // Add zoom behavior
        const zoom = d3.zoom()
            .scaleExtent([0.5, 3])
            .on('zoom', (event) => {
                this.svg.select('g').attr('transform', event.transform);
            });
        
        this.svg.call(zoom);
        
        // Main group for all elements
        this.g = this.svg.append('g');
        
        // Define arrow markers for directed edges
        this.svg.append('defs').selectAll('marker')
            .data(['reinforcing', 'balancing'])
            .enter().append('marker')
            .attr('id', d => `arrow-${d}`)
            .attr('viewBox', '0 -5 10 10')
            .attr('refX', 20)
            .attr('refY', 0)
            .attr('markerWidth', 6)
            .attr('markerHeight', 6)
            .attr('orient', 'auto')
            .append('path')
            .attr('d', 'M0,-5L10,0L0,5')
            .attr('fill', d => d === 'reinforcing' ? '#2ecc71' : '#e74c3c');
        
        // Initialize force simulation
        this.simulation = d3.forceSimulation()
            .force('link', d3.forceLink().id(d => d.id).distance(100))
            .force('charge', d3.forceManyBody().strength(-300))
            .force('center', d3.forceCenter(this.width / 2, this.height / 2))
            .force('collision', d3.forceCollide().radius(30));
    }
    
    loadData(problem) {
        // Convert problem data to D3 format
        this.nodes = [];
        this.links = [];
        
        const nodeIdMap = new Map();
        let nodeId = 0;
        
        // Add problem node
        const problemNode = {
            id: 'problem',
            label: problem.title,
            type: 'problem',
            x: this.width / 2,
            y: this.height / 2
        };
        this.nodes.push(problemNode);
        nodeIdMap.set('problem', nodeId++);
        
        // Add cause nodes
        problem.causes?.forEach((cause, index) => {
            const causeNode = {
                id: `cause-${index}`,
                label: cause.description.substring(0, 30) + '...',
                type: 'cause',
                subtype: cause.type,
                fullDescription: cause.description
            };
            this.nodes.push(causeNode);
            nodeIdMap.set(`cause-${index}`, nodeId++);
            
            // Add link from cause to problem
            this.links.push({
                source: `cause-${index}`,
                target: 'problem',
                type: 'causal',
                strength: 1.0
            });
        });
        
        // Add impact nodes
        problem.impacts?.forEach((impact, index) => {
            const impactNode = {
                id: `impact-${index}`,
                label: impact.description.substring(0, 30) + '...',
                type: 'impact',
                subtype: impact.type,
                fullDescription: impact.description
            };
            this.nodes.push(impactNode);
            nodeIdMap.set(`impact-${index}`, nodeId++);
            
            // Add link from problem to impact
            this.links.push({
                source: 'problem',
                target: `impact-${index}`,
                type: 'causal',
                strength: 1.0
            });
        });
        
        // Add feedback loop nodes and links
        problem.feedback_loops?.forEach((loop, loopIndex) => {
            const loopNode = {
                id: `loop-${loopIndex}`,
                label: loop.description.substring(0, 30) + '...',
                type: 'feedback_loop',
                subtype: loop.type,
                fullDescription: loop.description
            };
            this.nodes.push(loopNode);
            nodeIdMap.set(`loop-${loopIndex}`, nodeId++);
            
            // Create loop connections
            loop.relationships?.forEach((rel, relIndex) => {
                if (relIndex < loop.relationships.length - 1) {
                    this.links.push({
                        source: rel,
                        target: loop.relationships[relIndex + 1],
                        type: loop.type,
                        strength: 0.8
                    });
                }
            });
        });
        
        this.render();
    }
    
    render() {
        // Clear existing elements
        this.g.selectAll('*').remove();
        
        // Create links
        const link = this.g.append('g')
            .selectAll('line')
            .data(this.links)
            .enter().append('line')
            .attr('class', 'link')
            .attr('stroke', d => d.type === 'reinforcing' ? '#2ecc71' : 
                              d.type === 'balancing' ? '#e74c3c' : '#95a5a6')
            .attr('stroke-width', d => Math.max(1, d.strength * 3))
            .attr('marker-end', d => `url(#arrow-${d.type})`)
            .style('opacity', 0.8);
        
        // Create node groups
        const node = this.g.append('g')
            .selectAll('g')
            .data(this.nodes)
            .enter().append('g')
            .attr('class', 'node')
            .call(d3.drag()
                .on('start', (event, d) => this.dragstarted(event, d))
                .on('drag', (event, d) => this.dragged(event, d))
                .on('end', (event, d) => this.dragended(event, d)));
        
        // Add node circles
        node.append('circle')
            .attr('r', d => {
                if (d.type === 'problem') return 25;
                if (d.type === 'feedback_loop') return 20;
                return 15;
            })
            .attr('fill', d => {
                if (d.type === 'problem') return '#3498db';
                if (d.type === 'cause') return '#f39c12';
                if (d.type === 'impact') return '#9b59b6';
                if (d.type === 'feedback_loop') {
                    return d.subtype === 'reinforcing' ? '#2ecc71' : '#e74c3c';
                }
                return '#95a5a6';
            })
            .attr('stroke', '#fff')
            .attr('stroke-width', 2)
            .style('cursor', 'pointer')
            .on('mouseover', (event, d) => this.showTooltip(event, d))
            .on('mouseout', () => this.hideTooltip());
        
        // Add node labels
        node.append('text')
            .text(d => d.label)
            .attr('x', 0)
            .attr('y', d => {
                if (d.type === 'problem') return 35;
                if (d.type === 'feedback_loop') return 30;
                return 25;
            })
            .attr('text-anchor', 'middle')
            .attr('font-size', '10px')
            .attr('font-family', 'Arial, sans-serif')
            .attr('fill', '#2c3e50')
            .style('pointer-events', 'none');
        
        // Update simulation
        this.simulation.nodes(this.nodes);
        this.simulation.force('link').links(this.links);
        
        this.simulation.on('tick', () => {
            link
                .attr('x1', d => d.source.x)
                .attr('y1', d => d.source.y)
                .attr('x2', d => d.target.x)
                .attr('y2', d => d.target.y);
            
            node.attr('transform', d => `translate(${d.x},${d.y})`);
        });
        
        this.simulation.alpha(1).restart();
    }
    
    dragstarted(event, d) {
        if (!event.active) this.simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }
    
    dragged(event, d) {
        d.fx = event.x;
        d.fy = event.y;
    }
    
    dragended(event, d) {
        if (!event.active) this.simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
    }
    
    showTooltip(event, d) {
        const tooltip = d3.select('body').append('div')
            .attr('class', 'tooltip')
            .style('position', 'absolute')
            .style('background', 'rgba(0, 0, 0, 0.8)')
            .style('color', 'white')
            .style('padding', '10px')
            .style('border-radius', '5px')
            .style('font-size', '12px')
            .style('pointer-events', 'none')
            .style('opacity', 0);
        
        tooltip.transition()
            .duration(200)
            .style('opacity', 1);
        
        let content = `<strong>${d.label}</strong><br>`;
        content += `Type: ${d.type}`;
        if (d.subtype) content += `<br>Subtype: ${d.subtype}`;
        if (d.fullDescription) {
            content += `<br><br>${d.fullDescription}`;
        }
        
        tooltip.html(content)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 28) + 'px');
    }
    
    hideTooltip() {
        d3.selectAll('.tooltip').remove();
    }
    
    // Advanced visualization methods
    
    createTimeSeriesChart(containerId, data) {
        const margin = {top: 20, right: 30, bottom: 40, left: 50};
        const width = 600 - margin.left - margin.right;
        const height = 400 - margin.top - margin.bottom;
        
        const svg = d3.select(`#${containerId}`)
            .append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
            .append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);
        
        // Parse dates
        const parseDate = d3.isoParse;
        data.forEach(d => {
            d.date = parseDate(d.date);
            d.value = +d.value;
        });
        
        // Set scales
        const x = d3.scaleTime()
            .domain(d3.extent(data, d => d.date))
            .range([0, width]);
        
        const y = d3.scaleLinear()
            .domain(d3.extent(data, d => d.value))
            .range([height, 0]);
        
        // Create line generator
        const line = d3.line()
            .x(d => x(d.date))
            .y(d => y(d.value))
            .curve(d3.curveMonotoneX);
        
        // Add axes
        svg.append('g')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(x));
        
        svg.append('g')
            .call(d3.axisLeft(y));
        
        // Add line
        svg.append('path')
            .datum(data)
            .attr('fill', 'none')
            .attr('stroke', '#3498db')
            .attr('stroke-width', 2)
            .attr('d', line);
        
        // Add dots
        svg.selectAll('.dot')
            .data(data)
            .enter().append('circle')
            .attr('class', 'dot')
            .attr('cx', d => x(d.date))
            .attr('cy', d => y(d.value))
            .attr('r', 4)
            .attr('fill', '#3498db');
    }
    
    createClusterVisualization(containerId, clusters) {
        const margin = {top: 20, right: 30, bottom: 40, left: 50};
        const width = 600 - margin.left - margin.right;
        const height = 400 - margin.top - margin.bottom;
        
        const svg = d3.select(`#${containerId}`)
            .append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
            .append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);
        
        // Prepare data for clustering visualization
        const clusterData = [];
        Object.entries(clusters).forEach(([clusterId, problems]) => {
            problems.forEach(problem => {
                clusterData.push({
                    cluster: +clusterId,
                    title: problem.title,
                    description: problem.description
                });
            });
        });
        
        // Create force layout for clusters
        const clusterSimulation = d3.forceSimulation(clusterData)
            .force('charge', d3.forceManyBody().strength(-100))
            .force('center', d3.forceCenter(width / 2, height / 2))
            .force('collision', d3.forceCollide().radius(20));
        
        const node = svg.selectAll('.cluster-node')
            .data(clusterData)
            .enter().append('g')
            .attr('class', 'cluster-node');
        
        node.append('circle')
            .attr('r', 15)
            .attr('fill', d => this.colorScale(d.cluster))
            .attr('stroke', '#fff')
            .attr('stroke-width', 2);
        
        node.append('text')
            .text(d => d.title.substring(0, 10) + '...')
            .attr('x', 0)
            .attr('y', 25)
            .attr('text-anchor', 'middle')
            .attr('font-size', '10px');
        
        clusterSimulation.on('tick', () => {
            node.attr('transform', d => `translate(${d.x},${d.y})`);
        });
        
        clusterSimulation.alpha(1).restart();
    }
    
    createHeatmap(containerId, data) {
        const margin = {top: 30, right: 30, bottom: 30, left: 30};
        const width = 600 - margin.left - margin.right;
        const height = 400 - margin.top - margin.bottom;
        
        const svg = d3.select(`#${containerId}`)
            .append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
            .append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);
        
        // Create color scale
        const colorScale = d3.scaleSequential(d3.interpolateBlues)
            .domain([0, d3.max(data, d => d.value)]);
        
        // Create cells
        const cellSize = Math.min(width / data[0].length, height / data.length);
        
        const cells = svg.selectAll('.cell')
            .data(data)
            .enter().append('rect')
            .attr('class', 'cell')
            .attr('x', (d, i) => (i % data[0].length) * cellSize)
            .attr('y', (d, i) => Math.floor(i / data[0].length) * cellSize)
            .attr('width', cellSize - 1)
            .attr('height', cellSize - 1)
            .attr('fill', d => colorScale(d.value))
            .attr('stroke', '#fff')
            .attr('stroke-width', 1);
        
        // Add hover effects
        cells.on('mouseover', function(event, d) {
            d3.select(this)
                .attr('stroke', '#000')
                .attr('stroke-width', 2);
        })
        .on('mouseout', function(event, d) {
            d3.select(this)
                .attr('stroke', '#fff')
                .attr('stroke-width', 1);
        });
    }
    
    updateSimulationParameters(params) {
        if (params.chargeStrength !== undefined) {
            this.simulation.force('charge').strength(params.chargeStrength);
        }
        if (params.linkDistance !== undefined) {
            this.simulation.force('link').distance(params.linkDistance);
        }
        if (params.collisionRadius !== undefined) {
            this.simulation.force('collision').radius(params.collisionRadius);
        }
        this.simulation.alpha(1).restart();
    }
    
    exportAsSVG() {
        const svgData = this.svg.node().outerHTML;
        const blob = new Blob([svgData], {type: 'image/svg+xml'});
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = 'causal-loop-diagram.svg';
        link.click();
        
        URL.revokeObjectURL(url);
    }
    
    clear() {
        this.g.selectAll('*').remove();
        this.nodes = [];
        this.links = [];
    }
}

// Global instance
window.D3CausalLoopVisualizer = D3CausalLoopVisualizer;
