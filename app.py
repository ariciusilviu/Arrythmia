import os
from pathlib import Path
import jsonpickle
from flask import Flask, make_response, request, jsonify, render_template
from constant import UPLOAD_FOLDER
from signal_processing import predict_signal
from sklearn.metrics import roc_auc_score
from tensorflow import keras
from werkzeug.utils import secure_filename

app = Flask(__name__)

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
    signal_path = save_form_file(request, 'signal')
    patient_no = Path(signal_path).stem
    annotation_path = save_form_file(request, 'annotation')
    hea_path = save_form_file(request, 'hea')
    x_sub, y_sub_preds_dense = predict_signal(patient_no)

    resp = make_response(jsonpickle.encode(({'input' : x_sub.tolist(), 'prediction' : y_sub_preds_dense.tolist()}), unpicklable=False), 200)

    # cleanup
    os.remove(signal_path)
    os.remove(annotation_path)
    os.remove(hea_path)
    return resp

if __name__ == "__main__":
    app.run(debug=True)
