# Causal Loop Modeling Application

A web-based application for analyzing problems using systems thinking, root cause analysis, and causal loop modeling.

## Features

### Core Functionality
- **Problem Management**: Create, edit, and delete problems
- **Causal Analysis**: Define primary, secondary, and latent causes
- **Impact Assessment**: Categorize technical, business, operational, environmental, health, and educational impacts
- **Feedback Loops**: Identify reinforcing (R) and balancing (B) feedback loops
- **Remediation Planning**: Map short-term, long-term, and preventive solutions
- **JSON Export/Import**: Structured data exchange

### Advanced Visualization & Interactivity
- **Animated Loop Simulation**: Watch variables change over time in reinforcing/balancing loops
- **Scenario Testing**: Adjust variables in real-time and see system behavior changes
- **3D Visualization**: Toggle between 2D and 3D views for complex diagrams
- **Real-time Charts**: Live behavior charts showing variable dynamics
- **System Metrics**: Monitor stability, growth rate, and loop dominance
- **Interactive Timeline**: Control simulation speed and progress

### Collaboration Features
- **Real-time Collaboration**: Multiple users working on the same diagram
- **Share Links**: Generate secure links for team collaboration
- **Live Activity Feed**: Track changes and participant actions
- **User Roles**: Owner, Editor, and Viewer permissions

### Learning & Examples
- **Demo Examples**: Pre-built real-world examples including:
  - Population Growth Dynamics
  - Market Supply-Demand Equilibrium
  - Employee Burnout Cycles
  - Climate Change Feedback Loops
  - Social Media Addiction Patterns
- **Interactive Tutorial**: Step-by-step guidance for learning causal loop modeling
- **Educational Content**: Comprehensive explanations of system dynamics

## Installation

1. Install Python dependencies:
```bash
pip install -r requirements.txt
```

2. Run the application:
```bash
python app.py
```

3. Open your browser and navigate to:
```
http://localhost:5000
```

## Data Structure

The application uses a structured JSON format:

```json
{
  "id": "unique-identifier",
  "title": "Problem Title",
  "description": "Problem Description",
  "causes": [
    {
      "description": "Cause description",
      "type": "primary|secondary|latent"
    }
  ],
  "impacts": [
    {
      "description": "Impact description", 
      "type": "technical|business|operational"
    }
  ],
  "feedback_loops": [
    {
      "description": "Loop description",
      "type": "reinforcing|balancing",
      "relationships": ["Cause1", "Effect1", "Cause2"]
    }
  ],
  "remediations": [
    {
      "description": "Remediation description",
      "type": "short_term|long_term|preventive",
      "targets": ["target1", "target2"]
    }
  ]
}
```

## Usage

### Learning with Examples

1. **Explore Demo Examples**: Click on any example card in the "Demo Examples & Tutorials" section to see pre-built causal loop diagrams
2. **Interactive Tutorial**: Select the "Interactive Tutorial" example to learn step-by-step how to build causal loop diagrams
3. **Study Real-World Patterns**: Examine examples like Population Growth, Market Dynamics, Employee Burnout, Climate Change, and Social Media Addiction

### Advanced Simulation Features

1. **Start Simulation**: Click "Start Simulation" to begin animated loop dynamics
2. **Adjust Variables**: Use scenario testing controls to modify variable values in real-time
3. **Monitor Behavior**: Watch real-time charts showing how variables change over time
4. **3D Visualization**: Toggle to 3D view for enhanced understanding of complex relationships
5. **System Metrics**: Track stability, growth rate, and loop dominance indicators

### Real-time Collaboration

1. **Enable Collaboration**: Click "Collaborate" to start a collaborative session
2. **Share Session**: Generate share links for team members to join
3. **Live Activity**: Monitor participant actions and changes in the activity feed
4. **Simultaneous Editing**: Work together on the same causal loop diagram

### Creating Your Own Analysis

1. **Create a New Problem**: Click "New Problem" and fill in the details
2. **Add Causes**: Define primary, secondary, and latent causes
3. **Identify Impacts**: Categorize technical, business, operational, environmental, health, and educational impacts
4. **Map Feedback Loops**: Define reinforcing (R) or balancing (B) loops with cause→effect relationships
5. **Plan Remediations**: Add short-term, long-term, and preventive solutions
6. **Simulate**: Run animated simulations to understand system dynamics
7. **Export**: Download the analysis as JSON for documentation or sharing

### Understanding Loop Types

- **Reinforcing Loops (R)**: Amplify change, creating exponential growth or decline (virtuous/vicious cycles)
- **Balancing Loops (B)**: Stabilize systems, creating equilibrium or goal-seeking behavior

### Tips for Effective Analysis

- Start with simple models and add complexity gradually
- Look for circular relationships that close back on themselves
- Identify leverage points where small changes can have big impacts
- Consider both short-term and long-term consequences
- Get feedback from others to validate your model

## API Endpoints

- `GET /api/problems` - List all problems
- `POST /api/problems` - Create new problem
- `GET /api/problems/{id}` - Get specific problem
- `PUT /api/problems/{id}` - Update problem
- `DELETE /api/problems/{id}` - Delete problem
- `GET /api/export/{id}` - Export problem as JSON
- `POST /api/import` - Import problem from JSON

## Technologies Used

- **Backend**: Flask (Python)
- **Frontend**: HTML5, CSS3, JavaScript, Tailwind CSS
- **Visualization**: Vis.js Network
- **Data Storage**: JSON file storage

## File Structure

```
Causal Loop/
├── app.py                 # Flask backend application
├── requirements.txt       # Python dependencies
├── causal_data.json      # Data storage (created automatically)
├── templates/
│   └── index.html        # Main web interface
├── static/
│   └── app.js           # Frontend JavaScript
└── README.md            # This file
```

## Contributing

This application is designed for local use and systems thinking analysis. Feel free to modify and extend it for your specific needs.
