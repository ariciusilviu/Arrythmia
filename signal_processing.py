from constant import ABNORMAL, FS, NUM_SEC, UPLOAD_FOLDER
from keras.models import Sequential
from keras.layers import Dense, Dropout
from tensorflow import keras
import numpy as np
import pandas as pd
import wfdb

def predict_signal(patient):
    patients = []
    patients.append(patient)
    x_sub, y_sub, sym_sub = make_dataset(patients, NUM_SEC, FS, ABNORMAL)
    model = Sequential()
    model.add(Dense(32, activation = 'relu', input_dim = x_sub.shape[1]))
    model.add(Dropout(rate = 0.25))
    model.add(Dense(1, activation = 'sigmoid'))

    # compile the model - use categorical crossentropy, and the adam optimizer
    model.compile(
                    loss = 'binary_crossentropy',
                    optimizer = 'adam',
                    metrics = ['accuracy'])

    model = keras.models.load_model('saved_models/my_model')
    model.predict(x_sub, verbose=1)
    y_sub_preds_dense = model.predict(x_sub, verbose=0)
    return (x_sub, y_sub_preds_dense)

def make_dataset(pts, num_sec, fs, abnormal):
    num_cols = int(2 * num_sec * fs)
    X_all = np.zeros((1, num_cols))
    Y_all = np.zeros((1, 1))
    sym_all = []
    # list to keep track of number of beats across patients
    max_rows = []

    for pt in pts:
        file = UPLOAD_FOLDER + pt

        p_signal, atr_sym, atr_sample = load_ecg(file)

        # grab the first signal
        p_signal = p_signal[:, 0]

        # make df to exclude the nonbeats
        df_ann = pd.DataFrame({'atr_sym': atr_sym,
                               'atr_sample': atr_sample})
        df_ann = df_ann.loc[df_ann.atr_sym.isin(abnormal + ['N'])]

        X, Y, sym = build_XY(p_signal, df_ann, num_cols, abnormal)

        sym_all = sym_all + sym
        max_rows.append(X.shape[0])
        X_all = np.append(X_all, X, axis=0)
        Y_all = np.append(Y_all, Y, axis=0)
    # drop the first zero row
    X_all = X_all[1:, :]
    Y_all = Y_all[1:, :]
    # check sizes make sense
    assert np.sum(max_rows) == X_all.shape[0], 'number of X, max_rows rows messed up'
    assert Y_all.shape[0] == X_all.shape[0], 'number of X, Y rows messed up'
    assert Y_all.shape[0] == len(sym_all), 'number of Y, sym rows messed up'

    return X_all, Y_all, sym_all

def load_ecg(file):
    record = wfdb.rdrecord(file)

    annotation = wfdb.rdann(file, 'atr')

    p_signal = record.p_signal

    assert record.fs == 360

    atr_sym = annotation.symbol
    atr_sample = annotation.sample

    return p_signal, atr_sym, atr_sample

def build_XY(p_signal, df_ann, num_cols, abnormal):
    # this function builds the X,Y matrices for each beat
    # it also returns the original symbols for Y

    num_rows = len(df_ann)
    X = np.zeros((num_rows, num_cols))
    Y = np.zeros((num_rows, 1))
    sym = []

    # keep track of rows
    max_row = 0
    for atr_sample, atr_sym in zip(df_ann.atr_sample.values, df_ann.atr_sym.values):
        left = max([0, int(atr_sample - NUM_SEC * FS)])
        right = min([len(p_signal), int(atr_sample + NUM_SEC * FS)])
        x = p_signal[left: right]
        if len(x) == num_cols:
            X[max_row, :] = x
            Y[max_row, :] = int(atr_sym in abnormal)
            sym.append(atr_sym)
            max_row += 1
    X = X[:max_row, :]
    Y = Y[:max_row, :]
    return X, Y, sym