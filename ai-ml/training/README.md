# AI/ML Developer Training Guide (Phase 0)

This syllabus guides developers through building the foundational knowledge required for the School ERP AI features.

---

## 📚 1. Core ML Concepts (Google ML Crash Course)
Understand the math, algorithms, and workflows behind machine learning.
- **Resource**: [Google Machine Learning Crash Course](https://developers.google.com/machine-learning/crash-course)
- **Key Concepts**:
  - Supervised vs Unsupervised Learning
  - Linear Regression & Logistic Regression (used for Topic Difficulty & Student Dropout predictions)
  - Features, Labels, Loss, and Gradient Descent
  - Training, Validation, and Test Datasets
  - Evaluation Metrics: Accuracy, Precision, Recall, F1-Score, and ROC-AUC

---

## 🦙 2. Local LLM Integration (Ollama & LangChain)
Learn how to host and query large language models locally on developer machines without external API costs.
- **Resources**:
  - [Ollama Official GitHub](https://github.com/ollama/ollama)
  - [LangChain Python Documentation](https://python.langchain.com/)
- **Quick-Start Example**:
  ```python
  import ollama
  
  response = ollama.chat(model='llama3', messages=[
      {
          'role': 'user',
          'content': 'Explain the difference between algebra and geometry in one sentence.'
      }
  ])
  print(response['message']['content'])
  ```

---

## 📸 3. Computer Vision & Face Recognition (OpenCV & DeepFace)
For attendance automation and secure kiosk logins.
- **Resources**:
  - [OpenCV Python Tutorials](https://docs.opencv.org/master/d6/d00/tutorial_py_root.html)
  - [DeepFace Repository](https://github.com/serengil/deepface)
- **Quick-Start Example**:
  ```python
  from deepface import DeepFace
  
  # Find face matches in a database directory
  result = DeepFace.find(
      img_path="captured_student.jpg", 
      db_path="student_photos_directory", 
      model_name="VGG-Face", 
      enforce_detection=False
  )
  print(result)
  ```

---

## 📈 4. Tabular Predictions (Scikit-Learn & XGBoost)
For student risk analysis and financial billing predictions.
- **Resources**:
  - [Scikit-learn Getting Started](https://scikit-learn.org/stable/getting_started.html)
  - [XGBoost Documentation](https://xgboost.readthedocs.io/)
- **Quick-Start Example**:
  ```python
  import pandas as pd
  from sklearn.model_selection import train_test_split
  from sklearn.ensemble import RandomForestClassifier
  from sklearn.metrics import classification_report
  
  # Predict student risk based on attendance & exam marks
  df = pd.read_csv("student_historical_data.csv")
  X = df[['attendance_percentage', 'average_grade_marks']]
  y = df['is_at_risk']
  
  X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2)
  model = RandomForestClassifier()
  model.fit(X_train, y_train)
  
  predictions = model.predict(X_test)
  print(classification_report(y_test, predictions))
  ```
