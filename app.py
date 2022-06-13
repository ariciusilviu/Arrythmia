import os
import jsonpickle
import numpy as np
from flask import Flask, make_response, request, jsonify, render_template
from sklearn.metrics import roc_auc_score
from tensorflow import keras
from werkzeug.utils import secure_filename

app = Flask(__name__)

UPLOAD_FOLDER = 'static/uploads/'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

dir = os.path.dirname(__file__)
data_path = os.path.join(dir, 'saved_models','my_model')
model = keras.models.load_model(data_path)

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/predict',methods=['POST'])
def predict():
    '''
    For rendering results on HTML GUI
    '''
    int_features = [int(x) for x in request.form.values()]
    final_features = [np.array(int_features)]
    prediction = model.predict(final_features)

    output = round(prediction[0], 2)

    return render_template('index.html', prediction_text='Salary is {}'.format(output))


@app.route('/predict_api',methods=['POST'])
def predict_api():
    signal = request.files['signal']
    filename = secure_filename(signal.filename)
    path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    signal.save(path)
    x = np.genfromtxt(path, delimiter=',')

    y = model.predict(x)

    resp = make_response(jsonpickle.encode((x, y), unpicklable=False), 200)
    return resp

if __name__ == "__main__":
    app.run(debug=True)