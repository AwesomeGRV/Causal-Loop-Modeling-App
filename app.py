from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import json
import os
from datetime import datetime
import uuid

app = Flask(__name__)
CORS(app)

# Data storage
DATA_FILE = 'causal_data.json'

def load_data():
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, 'r') as f:
            return json.load(f)
    return {"problems": []}

def save_data(data):
    with open(DATA_FILE, 'w') as f:
        json.dump(data, f, indent=2)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/problems', methods=['GET'])
def get_problems():
    data = load_data()
    return jsonify(data)

@app.route('/api/problems', methods=['POST'])
def create_problem():
    data = load_data()
    problem_data = request.json
    
    # Validate required fields
    required_fields = ['title', 'description']
    for field in required_fields:
        if field not in problem_data:
            return jsonify({'error': f'Missing required field: {field}'}), 400
    
    # Create problem with unique ID
    problem = {
        'id': str(uuid.uuid4()),
        'title': problem_data['title'],
        'description': problem_data['description'],
        'causes': problem_data.get('causes', []),
        'impacts': problem_data.get('impacts', []),
        'feedback_loops': problem_data.get('feedback_loops', []),
        'remediations': problem_data.get('remediations', []),
        'created_at': datetime.now().isoformat(),
        'updated_at': datetime.now().isoformat()
    }
    
    data['problems'].append(problem)
    save_data(data)
    return jsonify(problem), 201

@app.route('/api/problems/<problem_id>', methods=['GET'])
def get_problem(problem_id):
    data = load_data()
    problem = next((p for p in data['problems'] if p['id'] == problem_id), None)
    if not problem:
        return jsonify({'error': 'Problem not found'}), 404
    return jsonify(problem)

@app.route('/api/problems/<problem_id>', methods=['PUT'])
def update_problem(problem_id):
    data = load_data()
    problem = next((p for p in data['problems'] if p['id'] == problem_id), None)
    if not problem:
        return jsonify({'error': 'Problem not found'}), 404
    
    problem_data = request.json
    problem.update(problem_data)
    problem['updated_at'] = datetime.now().isoformat()
    
    save_data(data)
    return jsonify(problem)

@app.route('/api/problems/<problem_id>', methods=['DELETE'])
def delete_problem(problem_id):
    data = load_data()
    data['problems'] = [p for p in data['problems'] if p['id'] != problem_id]
    save_data(data)
    return jsonify({'message': 'Problem deleted successfully'})

@app.route('/api/export/<problem_id>', methods=['GET'])
def export_problem(problem_id):
    data = load_data()
    problem = next((p for p in data['problems'] if p['id'] == problem_id), None)
    if not problem:
        return jsonify({'error': 'Problem not found'}), 404
    
    return jsonify(problem)

@app.route('/api/import', methods=['POST'])
def import_problem():
    data = load_data()
    problem_data = request.json
    
    # Generate new ID to avoid conflicts
    problem_data['id'] = str(uuid.uuid4())
    problem_data['created_at'] = datetime.now().isoformat()
    problem_data['updated_at'] = datetime.now().isoformat()
    
    data['problems'].append(problem_data)
    save_data(data)
    return jsonify(problem_data), 201

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
