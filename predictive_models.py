import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import mean_squared_error, r2_score
import joblib
from typing import Dict, List, Tuple, Any
from datetime import datetime, timedelta
import json

class PredictiveAnalytics:
    """Predictive modeling for causal loop forecasting and simulation"""
    
    def __init__(self):
        self.time_series_models = {}
        self.impact_predictor = None
        self.loop_dynamics_model = None
        self.scaler = StandardScaler()
        
    def prepare_time_series_data(self, problems: List[Dict]) -> pd.DataFrame:
        """Prepare time series data from historical problem data"""
        data = []
        
        for problem in problems:
            created_at = problem.get('created_at', '')
            if created_at:
                try:
                    timestamp = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                except:
                    timestamp = datetime.now()
            else:
                timestamp = datetime.now()
            
            # Extract metrics
            data.append({
                'timestamp': timestamp,
                'problem_id': problem.get('id'),
                'causes_count': len(problem.get('causes', [])),
                'impacts_count': len(problem.get('impacts', [])),
                'feedback_loops_count': len(problem.get('feedback_loops', [])),
                'remediations_count': len(problem.get('remediations', [])),
                'complexity_score': self._calculate_complexity_score(problem),
                'reinforcing_loops': sum(1 for fl in problem.get('feedback_loops', []) 
                                       if fl.get('type') == 'reinforcing'),
                'balancing_loops': sum(1 for fl in problem.get('feedback_loops', []) 
                                     if fl.get('type') == 'balancing')
            })
        
        df = pd.DataFrame(data)
        df = df.sort_values('timestamp')
        return df
    
    def _calculate_complexity_score(self, problem: Dict) -> float:
        """Calculate complexity score for a problem"""
        causes = problem.get('causes', [])
        impacts = problem.get('impacts', [])
        feedback_loops = problem.get('feedback_loops', [])
        
        # Weight different factors
        score = 0
        score += len(causes) * 1.0
        score += len(impacts) * 0.8
        score += len(feedback_loops) * 1.5
        
        # Add complexity for different types
        cause_types = set(c.get('type') for c in causes)
        impact_types = set(i.get('type') for i in impacts)
        score += len(cause_types) * 0.5
        score += len(impact_types) * 0.3
        
        return score
    
    def train_time_series_models(self, problems: List[Dict]) -> Dict[str, Any]:
        """Train time series models for trend forecasting"""
        df = self.prepare_time_series_data(problems)
        
        if len(df) < 5:
            return {"error": "Insufficient historical data"}
        
        # Create features for time series
        df['day_of_week'] = df['timestamp'].dt.dayofweek
        df['month'] = df['timestamp'].dt.month
        df['quarter'] = df['timestamp'].dt.quarter
        df['days_since_start'] = (df['timestamp'] - df['timestamp'].min()).dt.days
        
        # Train models for different metrics
        metrics = ['causes_count', 'impacts_count', 'feedback_loops_count', 'complexity_score']
        models = {}
        
        for metric in metrics:
            # Prepare features
            features = ['day_of_week', 'month', 'quarter', 'days_since_start']
            X = df[features].values
            y = df[metric].values
            
            # Train model
            model = RandomForestRegressor(n_estimators=50, random_state=42)
            model.fit(X, y)
            
            # Calculate performance
            y_pred = model.predict(X)
            mse = mean_squared_error(y, y_pred)
            r2 = r2_score(y, y_pred)
            
            models[metric] = {
                'model': model,
                'mse': mse,
                'r2': r2,
                'features': features
            }
        
        self.time_series_models = models
        return {
            "models_trained": True,
            "metrics_trained": list(models.keys()),
            "performance": {k: {'mse': v['mse'], 'r2': v['r2']} for k, v in models.items()}
        }
    
    def forecast_trends(self, days_ahead: int = 30) -> Dict[str, Any]:
        """Forecast future trends based on trained models"""
        if not self.time_series_models:
            return {"error": "Models not trained"}
        
        forecasts = {}
        last_date = datetime.now()
        
        for metric, model_info in self.time_series_models.items():
            model = model_info['model']
            features = model_info['features']
            
            # Generate future dates
            future_dates = [last_date + timedelta(days=i) for i in range(1, days_ahead + 1)]
            
            # Create features for future dates
            future_features = []
            for date in future_dates:
                feature_row = [
                    date.dayofweek,  # day_of_week
                    date.month,      # month
                    (date.month - 1) // 3 + 1,  # quarter
                    (date - last_date).days  # days_since_start
                ]
                future_features.append(feature_row)
            
            # Make predictions
            predictions = model.predict(future_features)
            
            forecasts[metric] = {
                'dates': [d.isoformat() for d in future_dates],
                'predictions': predictions.tolist(),
                'current_trend': 'increasing' if predictions[-1] > predictions[0] else 'decreasing'
            }
        
        return forecasts
    
    def train_impact_predictor(self, problems: List[Dict]) -> Dict[str, Any]:
        """Train model to predict impacts based on causes and feedback loops"""
        if len(problems) < 10:
            return {"error": "Insufficient data for impact prediction"}
        
        # Prepare training data
        X = []
        y = []
        
        for problem in problems:
            features = []
            
            # Cause features
            causes = problem.get('causes', [])
            features.extend([
                len(causes),
                sum(1 for c in causes if c.get('type') == 'primary'),
                sum(1 for c in causes if c.get('type') == 'secondary'),
                sum(1 for c in causes if c.get('type') == 'latent')
            ])
            
            # Feedback loop features
            feedback_loops = problem.get('feedback_loops', [])
            features.extend([
                len(feedback_loops),
                sum(1 for fl in feedback_loops if fl.get('type') == 'reinforcing'),
                sum(1 for fl in feedback_loops if fl.get('type') == 'balancing')
            ])
            
            # Complexity features
            features.append(self._calculate_complexity_score(problem))
            
            # Target: number of impacts
            target = len(problem.get('impacts', []))
            
            X.append(features)
            y.append(target)
        
        # Train model
        X = np.array(X)
        y = np.array(y)
        
        X_scaled = self.scaler.fit_transform(X)
        
        self.impact_predictor = RandomForestRegressor(n_estimators=100, random_state=42)
        self.impact_predictor.fit(X_scaled, y)
        
        # Evaluate
        y_pred = self.impact_predictor.predict(X_scaled)
        mse = mean_squared_error(y, y_pred)
        r2 = r2_score(y, y_pred)
        
        return {
            "model_trained": True,
            "mse": mse,
            "r2": r2,
            "feature_importance": dict(zip(
                ['total_causes', 'primary_causes', 'secondary_causes', 'latent_causes',
                 'total_loops', 'reinforcing_loops', 'balancing_loops', 'complexity_score'],
                self.impact_predictor.feature_importances_
            ))
        }
    
    def predict_impacts(self, problem: Dict) -> Dict[str, Any]:
        """Predict number and type of impacts for a given problem"""
        if self.impact_predictor is None:
            return {"error": "Impact predictor not trained"}
        
        # Extract features
        causes = problem.get('causes', [])
        feedback_loops = problem.get('feedback_loops', [])
        
        features = [
            len(causes),
            sum(1 for c in causes if c.get('type') == 'primary'),
            sum(1 for c in causes if c.get('type') == 'secondary'),
            sum(1 for c in causes if c.get('type') == 'latent'),
            len(feedback_loops),
            sum(1 for fl in feedback_loops if fl.get('type') == 'reinforcing'),
            sum(1 for fl in feedback_loops if fl.get('type') == 'balancing'),
            self._calculate_complexity_score(problem)
        ]
        
        # Make prediction
        features_scaled = self.scaler.transform([features])
        predicted_impacts = self.impact_predictor.predict(features_scaled)[0]
        
        # Predict impact types based on historical patterns
        impact_type_prediction = self._predict_impact_types(problem)
        
        return {
            "predicted_impact_count": int(round(predicted_impacts)),
            "confidence": max(0.5, min(0.95, self.impact_predictor.score(features_scaled, [predicted_impacts]))),
            "predicted_types": impact_type_prediction
        }
    
    def _predict_impact_types(self, problem: Dict) -> Dict[str, float]:
        """Predict likely impact types based on problem characteristics"""
        text_content = f"{problem.get('title', '')} {problem.get('description', '')}".lower()
        causes = [c.get('description', '').lower() for c in problem.get('causes', [])]
        
        # Simple rule-based prediction
        impact_scores = {
            'technical': 0.0,
            'business': 0.0,
            'operational': 0.0,
            'environmental': 0.0,
            'health': 0.0,
            'educational': 0.0
        }
        
        # Technical indicators
        tech_keywords = ['software', 'hardware', 'system', 'technology', 'data', 'network']
        impact_scores['technical'] = sum(1 for kw in tech_keywords if kw in text_content) * 0.2
        
        # Business indicators
        business_keywords = ['revenue', 'cost', 'profit', 'market', 'customer', 'sales']
        impact_scores['business'] = sum(1 for kw in business_keywords if kw in text_content) * 0.2
        
        # Operational indicators
        operational_keywords = ['process', 'workflow', 'efficiency', 'productivity', 'operation']
        impact_scores['operational'] = sum(1 for kw in operational_keywords if kw in text_content) * 0.2
        
        # Environmental indicators
        env_keywords = ['environment', 'pollution', 'energy', 'sustainability', 'climate']
        impact_scores['environmental'] = sum(1 for kw in env_keywords if kw in text_content) * 0.2
        
        # Health indicators
        health_keywords = ['health', 'safety', 'medical', 'patient', 'wellness']
        impact_scores['health'] = sum(1 for kw in health_keywords if kw in text_content) * 0.2
        
        # Educational indicators
        edu_keywords = ['education', 'learning', 'student', 'teacher', 'curriculum']
        impact_scores['educational'] = sum(1 for kw in edu_keywords if kw in text_content) * 0.2
        
        # Normalize scores
        total_score = sum(impact_scores.values())
        if total_score > 0:
            impact_scores = {k: v/total_score for k, v in impact_scores.items()}
        else:
            # Default distribution
            impact_scores = {k: 1/6 for k in impact_scores.keys()}
        
        return impact_scores
    
    def simulate_loop_dynamics(self, problem: Dict, time_steps: int = 50) -> Dict[str, Any]:
        """Simulate the dynamic behavior of feedback loops over time"""
        feedback_loops = problem.get('feedback_loops', [])
        
        if not feedback_loops:
            return {"error": "No feedback loops to simulate"}
        
        # Initialize variables
        reinforcing_vars = []
        balancing_vars = []
        
        for i, loop in enumerate(feedback_loops):
            if loop.get('type') == 'reinforcing':
                reinforcing_vars.append(1.0)  # Start with initial value
            else:
                balancing_vars.append(1.0)
        
        # Simulation parameters
        dt = 0.1  # Time step
        growth_rate = 0.05  # Growth rate for reinforcing loops
        decay_rate = 0.03   # Decay rate for balancing loops
        
        # Run simulation
        time_points = np.arange(0, time_steps * dt, dt)
        reinforcing_history = []
        balancing_history = []
        
        for t in time_points:
            # Update reinforcing loops (exponential growth)
            new_reinforcing = []
            for var in reinforcing_vars:
                new_var = var * (1 + growth_rate * dt)
                new_reinforcing.append(new_var)
            reinforcing_vars = new_reinforcing
            reinforcing_history.append(reinforcing_vars.copy())
            
            # Update balancing loops (goal-seeking behavior)
            new_balancing = []
            for var in balancing_vars:
                # Simple balancing: move toward equilibrium
                target = 2.0  # Target equilibrium value
                new_var = var + (target - var) * decay_rate * dt
                new_balancing.append(new_var)
            balancing_vars = new_balancing
            balancing_history.append(balancing_vars.copy())
        
        return {
            "time_points": time_points.tolist(),
            "reinforcing_loops": {
                "count": len(reinforcing_vars),
                "history": reinforcing_history,
                "final_values": reinforcing_vars
            },
            "balancing_loops": {
                "count": len(balancing_vars),
                "history": balancing_history,
                "final_values": balancing_vars
            },
            "system_stability": self._calculate_stability(reinforcing_history, balancing_history)
        }
    
    def _calculate_stability(self, reinforcing_history: List, balancing_history: List) -> Dict[str, Any]:
        """Calculate system stability metrics"""
        if not reinforcing_history and not balancing_history:
            return {"stability_score": 0.0, "behavior": "stable"}
        
        # Calculate variance in final values
        if reinforcing_history:
            final_reinforcing = reinforcing_history[-1]
            reinforcing_variance = np.var(final_reinforcing)
        else:
            reinforcing_variance = 0
        
        if balancing_history:
            final_balancing = balancing_history[-1]
            balancing_variance = np.var(final_balancing)
        else:
            balancing_variance = 0
        
        total_variance = reinforcing_variance + balancing_variance
        
        # Determine stability
        if total_variance < 0.1:
            behavior = "stable"
            stability_score = 0.9
        elif total_variance < 1.0:
            behavior = "moderately_stable"
            stability_score = 0.6
        else:
            behavior = "unstable"
            stability_score = 0.3
        
        return {
            "stability_score": stability_score,
            "behavior": behavior,
            "variance": total_variance
        }
    
    def save_models(self, filepath: str = "predictive_models.joblib"):
        """Save trained models to disk"""
        models = {
            'time_series_models': self.time_series_models,
            'impact_predictor': self.impact_predictor,
            'loop_dynamics_model': self.loop_dynamics_model,
            'scaler': self.scaler
        }
        joblib.dump(models, filepath)
    
    def load_models(self, filepath: str = "predictive_models.joblib"):
        """Load trained models from disk"""
        try:
            models = joblib.load(filepath)
            self.time_series_models = models.get('time_series_models', {})
            self.impact_predictor = models.get('impact_predictor')
            self.loop_dynamics_model = models.get('loop_dynamics_model')
            self.scaler = models.get('scaler')
            return True
        except FileNotFoundError:
            return False
