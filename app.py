import os
from pathlib import Path
import jsonpickle
from flask import Flask, make_response, request, jsonify, render_template
from signal_processing import predict_signal
from sklearn.metrics import roc_auc_score
from tensorflow import keras
from werkzeug.utils import secure_filename
import pickle
import json

app = Flask(__name__)

UPLOAD_FOLDER = 'static/uploads/'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

dir = os.path.dirname(__file__)
data_path = os.path.join(dir, 'saved_models','my_model')
model = keras.models.load_model(data_path)

def save_form_file(request, file_name):
    file = request.files[file_name]
    file_name_s = secure_filename(file.filename)
    path = os.path.join(app.config['UPLOAD_FOLDER'], file_name_s)
    file.save(path)
    return path

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/predict_api',methods=['POST'])
def predict_api():
    patient_no = Path(save_form_file(request, 'signal')).stem
    save_form_file(request, 'annotation')
    x_sub, y_sub_preds_dense = predict_signal(patient_no)

    resp = make_response(jsonpickle.encode(({'input' : x_sub.tolist()}, {'prediction' : y_sub_preds_dense.tolist()}), unpicklable=False), 200)
    return resp

if __name__ == "__main__":
    app.run(debug=True)
