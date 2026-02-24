import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier, IsolationForest
from sklearn.cluster import DBSCAN, KMeans
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.decomposition import PCA
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, silhouette_score
import joblib
import json
from typing import Dict, List, Tuple, Any

class CausalLoopMLModels:
    """Machine Learning models for causal loop analysis and pattern recognition"""
    
    def __init__(self):
        self.pattern_classifier = None
        self.anomaly_detector = None
        self.clustering_model = None
        self.scaler = StandardScaler()
        self.vectorizer = TfidfVectorizer(max_features=1000, stop_words='english')
        self.label_encoder = LabelEncoder()
        
        # System archetypes patterns
        self.system_archetypes = {
            'limits_to_growth': ['growth', 'limit', 'constraint', 'capacity', 'saturation'],
            'tragedy_of_commons': ['shared', 'resource', 'depletion', 'overuse', 'competition'],
            'escalation': ['competition', 'arms_race', 'retaliation', 'escalation', 'conflict'],
            'fixes_that_fail': ['solution', 'unintended', 'consequence', 'side_effect', 'worsen'],
            'shifting_the_burden': ['dependency', 'symptom', 'quick_fix', 'fundamental', 'weaken'],
            'success_to_successful': ['advantage', 'resource_allocation', 'rich_get_richer', 'inequality']
        }
        
    def extract_features(self, problems: List[Dict]) -> np.ndarray:
        """Extract features from problem data for ML analysis"""
        features = []
        
        for problem in problems:
            feature_vector = []
            
            # Text features
            text_content = f"{problem.get('title', '')} {problem.get('description', '')}"
            
            # Count-based features
            feature_vector.extend([
                len(problem.get('causes', [])),
                len(problem.get('impacts', [])),
                len(problem.get('feedback_loops', [])),
                len(problem.get('remediations', [])),
                len(text_content.split()),
                text_content.count('reinforcing'),
                text_content.count('balancing'),
                text_content.count('feedback'),
                text_content.count('loop'),
                text_content.count('cause'),
                text_content.count('effect'),
                text_content.count('impact'),
                text_content.count('system')
            ])
            
            # Type distribution features
            causes = problem.get('causes', [])
            impacts = problem.get('impacts', [])
            feedback_loops = problem.get('feedback_loops', [])
            
            feature_vector.extend([
                sum(1 for c in causes if c.get('type') == 'primary'),
                sum(1 for c in causes if c.get('type') == 'secondary'),
                sum(1 for c in causes if c.get('type') == 'latent'),
                sum(1 for i in impacts if i.get('type') == 'technical'),
                sum(1 for i in impacts if i.get('type') == 'business'),
                sum(1 for i in impacts if i.get('type') == 'operational'),
                sum(1 for i in impacts if i.get('type') == 'environmental'),
                sum(1 for i in impacts if i.get('type') == 'health'),
                sum(1 for i in impacts if i.get('type') == 'educational'),
                sum(1 for fl in feedback_loops if fl.get('type') == 'reinforcing'),
                sum(1 for fl in feedback_loops if fl.get('type') == 'balancing')
            ])
            
            features.append(feature_vector)
        
        return np.array(features)
    
    def train_pattern_classifier(self, problems: List[Dict]) -> Dict[str, Any]:
        """Train classifier to identify system archetypes"""
        if len(problems) < 10:
            return {"error": "Insufficient data for training"}
        
        # Extract features
        X = self.extract_features(problems)
        
        # Create labels based on content analysis
        labels = []
        for problem in problems:
            text_content = f"{problem.get('title', '')} {problem.get('description', '')}".lower()
            
            # Simple rule-based labeling for training
            label = 'unknown'
            max_score = 0
            
            for archetype, keywords in self.system_archetypes.items():
                score = sum(1 for keyword in keywords if keyword in text_content)
                if score > max_score:
                    max_score = score
                    label = archetype
            
            labels.append(label)
        
        # Encode labels
        y = self.label_encoder.fit_transform(labels)
        
        # Train classifier
        self.pattern_classifier = RandomForestClassifier(
            n_estimators=100,
            random_state=42,
            max_depth=10
        )
        
        X_scaled = self.scaler.fit_transform(X)
        X_train, X_test, y_train, y_test = train_test_split(
            X_scaled, y, test_size=0.2, random_state=42
        )
        
        self.pattern_classifier.fit(X_train, y_train)
        
        # Evaluate
        y_pred = self.pattern_classifier.predict(X_test)
        accuracy = self.pattern_classifier.score(X_test, y_test)
        
        return {
            "model_trained": True,
            "accuracy": accuracy,
            "classes": list(self.label_encoder.classes_),
            "feature_importance": dict(zip(
                ['causes_count', 'impacts_count', 'feedback_loops_count', 'remediations_count',
                 'word_count', 'reinforcing_count', 'balancing_count', 'feedback_count',
                 'loop_count', 'cause_count', 'effect_count', 'impact_count', 'system_count',
                 'primary_causes', 'secondary_causes', 'latent_causes', 'technical_impacts',
                 'business_impacts', 'operational_impacts', 'environmental_impacts',
                 'health_impacts', 'educational_impacts', 'reinforcing_loops', 'balancing_loops'],
                self.pattern_classifier.feature_importances_
            ))
        }
    
    def predict_system_archetype(self, problem: Dict) -> Dict[str, Any]:
        """Predict system archetype for a given problem"""
        if self.pattern_classifier is None:
            return {"error": "Model not trained"}
        
        features = self.extract_features([problem])
        features_scaled = self.scaler.transform(features)
        
        # Get prediction and probabilities
        prediction = self.pattern_classifier.predict(features_scaled)[0]
        probabilities = self.pattern_classifier.predict_proba(features_scaled)[0]
        
        # Convert back to label
        predicted_label = self.label_encoder.inverse_transform([prediction])[0]
        
        # Create probability distribution
        prob_dist = {}
        for i, prob in enumerate(probabilities):
            label = self.label_encoder.inverse_transform([i])[0]
            prob_dist[label] = float(prob)
        
        return {
            "predicted_archetype": predicted_label,
            "confidence": float(max(probabilities)),
            "probability_distribution": prob_dist
        }
    
    def detect_anomalies(self, problems: List[Dict]) -> Dict[str, Any]:
        """Detect anomalous patterns in causal loop data"""
        if len(problems) < 5:
            return {"error": "Insufficient data for anomaly detection"}
        
        features = self.extract_features(problems)
        features_scaled = self.scaler.fit_transform(features)
        
        # Train isolation forest
        self.anomaly_detector = IsolationForest(
            contamination=0.1,
            random_state=42
        )
        
        anomaly_labels = self.anomaly_detector.fit_predict(features_scaled)
        
        # Identify anomalies
        anomalies = []
        for i, label in enumerate(anomalies):
            if label == -1:  # Anomaly
                anomalies.append({
                    "problem_id": problems[i].get('id'),
                    "title": problems[i].get('title'),
                    "anomaly_score": float(self.anomaly_detector.decision_function(features_scaled)[i])
                })
        
        return {
            "anomalies_detected": len(anomalies),
            "anomalies": anomalies,
            "total_analyzed": len(problems)
        }
    
    def cluster_similar_problems(self, problems: List[Dict]) -> Dict[str, Any]:
        """Cluster similar problems for pattern analysis"""
        if len(problems) < 3:
            return {"error": "Insufficient data for clustering"}
        
        features = self.extract_features(problems)
        features_scaled = self.scaler.fit_transform(features)
        
        # Determine optimal number of clusters
        n_clusters = min(len(problems) // 2, 6)
        n_clusters = max(2, n_clusters)
        
        # Perform clustering
        self.clustering_model = KMeans(n_clusters=n_clusters, random_state=42)
        cluster_labels = self.clustering_model.fit_predict(features_scaled)
        
        # Calculate silhouette score
        silhouette_avg = silhouette_score(features_scaled, cluster_labels)
        
        # Group problems by cluster
        clusters = {}
        for i, label in enumerate(cluster_labels):
            if label not in clusters:
                clusters[label] = []
            clusters[label].append({
                "problem_id": problems[i].get('id'),
                "title": problems[i].get('title'),
                "description": problems[i].get('description')[:100] + "..."
            })
        
        return {
            "clusters": clusters,
            "silhouette_score": float(silhouette_avg),
            "n_clusters": n_clusters
        }
    
    def suggest_feedback_loops(self, problem: Dict) -> Dict[str, Any]:
        """Suggest potential feedback loops based on ML analysis"""
        text_content = f"{problem.get('title', '')} {problem.get('description', '')}".lower()
        causes = [c.get('description', '').lower() for c in problem.get('causes', [])]
        impacts = [i.get('description', '').lower() for i in problem.get('impacts', [])]
        
        suggestions = []
        
        # Analyze cause-impact relationships
        for cause in causes:
            for impact in impacts:
                # Check for reinforcing patterns
                if any(word in cause for word in ['increase', 'grow', 'expand', 'improve']) and \
                   any(word in impact for word in ['increase', 'grow', 'expand', 'improve']):
                    suggestions.append({
                        "type": "reinforcing",
                        "description": f"Potential reinforcing loop: {cause} → {impact}",
                        "confidence": 0.7
                    })
                
                # Check for balancing patterns
                if any(word in cause for word in ['increase', 'grow', 'expand']) and \
                   any(word in impact for word in ['decrease', 'reduce', 'limit', 'constraint']):
                    suggestions.append({
                        "type": "balancing",
                        "description": f"Potential balancing loop: {cause} → {impact}",
                        "confidence": 0.6
                    })
        
        # Sort by confidence
        suggestions.sort(key=lambda x: x['confidence'], reverse=True)
        
        return {
            "suggested_loops": suggestions[:5],  # Top 5 suggestions
            "total_suggestions": len(suggestions)
        }
    
    def save_models(self, filepath: str = "ml_models.joblib"):
        """Save trained models to disk"""
        models = {
            'pattern_classifier': self.pattern_classifier,
            'anomaly_detector': self.anomaly_detector,
            'clustering_model': self.clustering_model,
            'scaler': self.scaler,
            'vectorizer': self.vectorizer,
            'label_encoder': self.label_encoder
        }
        joblib.dump(models, filepath)
    
    def load_models(self, filepath: str = "ml_models.joblib"):
        """Load trained models from disk"""
        try:
            models = joblib.load(filepath)
            self.pattern_classifier = models.get('pattern_classifier')
            self.anomaly_detector = models.get('anomaly_detector')
            self.clustering_model = models.get('clustering_model')
            self.scaler = models.get('scaler')
            self.vectorizer = models.get('vectorizer')
            self.label_encoder = models.get('label_encoder')
            return True
        except FileNotFoundError:
            return False
