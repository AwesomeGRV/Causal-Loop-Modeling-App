from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from flask_socketio import SocketIO, emit
import json
import os
from datetime import datetime
import uuid
import threading
import time
from ml_models import CausalLoopMLModels
from predictive_models import PredictiveAnalytics

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

# Data storage
DATA_FILE = 'causal_data.json'

# Initialize ML models
ml_models = CausalLoopMLModels()
predictive_models = PredictiveAnalytics()

# Load existing models if available
ml_models.load_models()
predictive_models.load_models()

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
    
    # Emit real-time update
    socketio.emit('problem_added', problem_data)
    
    return jsonify(problem_data), 201

# ML Analytics Endpoints
@app.route('/api/ml/train-patterns', methods=['POST'])
def train_pattern_models():
    data = load_data()
    problems = data.get('problems', [])
    
    result = ml_models.train_pattern_classifier(problems)
    
    if result.get('model_trained'):
        ml_models.save_models()
        socketio.emit('models_updated', {'type': 'pattern_classifier', 'status': 'trained'})
    
    return jsonify(result)

@app.route('/api/ml/predict-archetype/<problem_id>', methods=['POST'])
def predict_archetype(problem_id):
    data = load_data()
    problem = next((p for p in data['problems'] if p['id'] == problem_id), None)
    
    if not problem:
        return jsonify({'error': 'Problem not found'}), 404
    
    result = ml_models.predict_system_archetype(problem)
    return jsonify(result)

@app.route('/api/ml/detect-anomalies', methods=['POST'])
def detect_anomalies():
    data = load_data()
    problems = data.get('problems', [])
    
    result = ml_models.detect_anomalies(problems)
    return jsonify(result)

@app.route('/api/ml/cluster-problems', methods=['POST'])
def cluster_problems():
    data = load_data()
    problems = data.get('problems', [])
    
    result = ml_models.cluster_similar_problems(problems)
    return jsonify(result)

@app.route('/api/ml/suggest-loops/<problem_id>', methods=['POST'])
def suggest_feedback_loops(problem_id):
    data = load_data()
    problem = next((p for p in data['problems'] if p['id'] == problem_id), None)
    
    if not problem:
        return jsonify({'error': 'Problem not found'}), 404
    
    result = ml_models.suggest_feedback_loops(problem)
    return jsonify(result)

# Predictive Analytics Endpoints
@app.route('/api/predictive/train-models', methods=['POST'])
def train_predictive_models():
    data = load_data()
    problems = data.get('problems', [])
    
    # Train time series models
    ts_result = predictive_models.train_time_series_models(problems)
    
    # Train impact predictor
    impact_result = predictive_models.train_impact_predictor(problems)
    
    if ts_result.get('models_trained') or impact_result.get('model_trained'):
        predictive_models.save_models()
        socketio.emit('models_updated', {'type': 'predictive_models', 'status': 'trained'})
    
    return jsonify({
        'time_series': ts_result,
        'impact_predictor': impact_result
    })

@app.route('/api/predictive/forecast', methods=['GET'])
def forecast_trends():
    days_ahead = request.args.get('days', 30, type=int)
    result = predictive_models.forecast_trends(days_ahead)
    return jsonify(result)

@app.route('/api/predictive/predict-impacts/<problem_id>', methods=['POST'])
def predict_impacts(problem_id):
    data = load_data()
    problem = next((p for p in data['problems'] if p['id'] == problem_id), None)
    
    if not problem:
        return jsonify({'error': 'Problem not found'}), 404
    
    result = predictive_models.predict_impacts(problem)
    return jsonify(result)

@app.route('/api/predictive/simulate/<problem_id>', methods=['POST'])
def simulate_loop_dynamics(problem_id):
    data = load_data()
    problem = next((p for p in data['problems'] if p['id'] == problem_id), None)
    
    if not problem:
        return jsonify({'error': 'Problem not found'}), 404
    
    time_steps = request.json.get('time_steps', 50) if request.json else 50
    result = predictive_models.simulate_loop_dynamics(problem, time_steps)
    return jsonify(result)

# WebSocket Events
@socketio.on('connect')
def handle_connect():
    emit('connected', {'message': 'Connected to Causal Loop Analytics'})

@socketio.on('disconnect')
def handle_disconnect():
    print('Client disconnected')

@socketio.on('request_real_time_analysis')
def handle_real_time_analysis(data):
    """Handle real-time analysis requests"""
    problem_id = data.get('problem_id')
    
    if problem_id:
        # Start background analysis
        thread = threading.Thread(target=background_analysis, args=(problem_id,))
        thread.daemon = True
        thread.start()

def background_analysis(problem_id):
    """Background task for real-time analysis"""
    data = load_data()
    problem = next((p for p in data['problems'] if p['id'] == problem_id), None)
    
    if problem:
        # Perform various analyses
        try:
            # Pattern prediction
            archetype_result = ml_models.predict_system_archetype(problem)
            socketio.emit('analysis_update', {
                'problem_id': problem_id,
                'type': 'archetype_prediction',
                'data': archetype_result
            })
            
            # Loop suggestions
            loop_suggestions = ml_models.suggest_feedback_loops(problem)
            socketio.emit('analysis_update', {
                'problem_id': problem_id,
                'type': 'loop_suggestions',
                'data': loop_suggestions
            })
            
            # Impact prediction
            impact_prediction = predictive_models.predict_impacts(problem)
            socketio.emit('analysis_update', {
                'problem_id': problem_id,
                'type': 'impact_prediction',
                'data': impact_prediction
            })
            
            # Simulation
            simulation_result = predictive_models.simulate_loop_dynamics(problem)
            socketio.emit('analysis_update', {
                'problem_id': problem_id,
                'type': 'simulation',
                'data': simulation_result
            })
            
        except Exception as e:
            socketio.emit('analysis_error', {
                'problem_id': problem_id,
                'error': str(e)
            })

def broadcast_system_updates():
    """Broadcast periodic system updates"""
    while True:
        try:
            # Get current statistics
            data = load_data()
            problems = data.get('problems', [])
            
            stats = {
                'total_problems': len(problems),
                'total_causes': sum(len(p.get('causes', [])) for p in problems),
                'total_impacts': sum(len(p.get('impacts', [])) for p in problems),
                'total_loops': sum(len(p.get('feedback_loops', [])) for p in problems),
                'timestamp': datetime.now().isoformat()
            }
            
            socketio.emit('system_stats', stats)
            
        except Exception as e:
            print(f"Error broadcasting updates: {e}")
        
        time.sleep(30)  # Update every 30 seconds

# Start background broadcasting
broadcast_thread = threading.Thread(target=broadcast_system_updates)
broadcast_thread.daemon = True
broadcast_thread.start()

if __name__ == '__main__':
    socketio.run(app, debug=True, host='0.0.0.0', port=5000)
