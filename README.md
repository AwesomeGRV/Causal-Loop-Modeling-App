# Causal Loop Modeling Application

A web-based application for analyzing problems using systems thinking, root cause analysis, and causal loop modeling.

## Features

- **Problem Management**: Create, edit, and delete problems
- **Causal Analysis**: Define primary, secondary, and latent causes
- **Impact Assessment**: Categorize technical, business, and operational impacts
- **Feedback Loops**: Identify reinforcing (R) and balancing (B) feedback loops
- **Remediation Planning**: Map short-term, long-term, and preventive solutions
- **Visual Diagrams**: Interactive causal loop diagrams
- **JSON Export/Import**: Structured data exchange

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

1. **Create a New Problem**: Click "New Problem" and fill in the details
2. **Add Causes**: Define primary, secondary, and latent causes
3. **Identify Impacts**: Categorize technical, business, and operational impacts
4. **Map Feedback Loops**: Define reinforcing (R) or balancing (B) loops with cause→effect relationships
5. **Plan Remediations**: Add short-term, long-term, and preventive solutions
6. **Visualize**: View the causal loop diagram to understand system dynamics
7. **Export**: Download the analysis as JSON for documentation or sharing

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
