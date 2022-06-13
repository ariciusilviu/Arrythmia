import numpy as np
from flask import Flask, request, jsonify
from tensorflow import keras

app = Flask(__name__)
model = keras.models.load_model('saved_models/my_model')
@app.route('/api',methods=['POST'])
def predict():
    data = request.get_json(force=True)
    prediction = model.predict([[np.array(data['exp'])]])
    output = prediction[0]
    return jsonify(output)
if __name__ == '__main__':
    try:
        app.run(port=5000, debug=True)
    except:
        print("Serverul este inchis")