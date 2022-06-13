import matplotlib
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from os import listdir
import wfdb
from sklearn.utils import resample
from imblearn.over_sampling import RandomOverSampler
from keras.callbacks import EarlyStopping
from keras.models import Sequential
from keras.layers import Dense, Flatten, Dropout
import pickle
from tensorflow import keras

data_path = 'C:/Users/Bogdan Ionut/Desktop/Silviu/mit-bih-arrhythmia-database-1.0.0/mit-bih-arrhythmia-database-1.0.0/'
pts = ['100', '101', '102', '103', '104', '106', '107', '108', '109', '112', '113', '114', '115', '116',
       '117', '118', '119', '121', '122', '123', '124', '200', '201', '202', '203', '205', '207',  '209', '210',
       '212', '213', '214', '215', '217', '219', '220', '221', '222', '223', '228', '230', '231', '232', '233', '234']

df = pd.DataFrame()


for pt in pts:
    file = data_path + pt
    annotation = wfdb.rdann(file, 'atr')
    sym = annotation.symbol

    values, counts = np.unique(sym, return_counts=True)
    df_sub = pd.DataFrame({'sym': values, 'val': counts, 'pt': [pt]*len(counts)})
    df = pd.concat([df, df_sub], axis=0)

df.groupby('sym').val.sum().sort_values(ascending=False)

nonbeat = ['[', '!', ']', 'x', '(', ')', 'p', 't', 'u', '`', '\ ', '^', '|', '~', '+', 's', 'T', '*', 'D', '=', '"', '@', 'Q', '?']
abnormal = ['L', 'R', 'V', '/', 'A', 'f', 'F', 'j', 'a', 'E', 'J', 'e', 'S']
normal =['N']
df['cat'] = -1
df.loc[df.sym == 'N', 'cat'] = 0
df.loc[df.sym.isin(abnormal), 'cat'] = 1


def load_ecg(file):

    record = wfdb.rdrecord(file)

    annotation = wfdb.rdann(file, 'atr')

    p_signal = record.p_signal

    assert record.fs == 360

    atr_sym = annotation.symbol
    atr_sample = annotation.sample

    return p_signal, atr_sym, atr_sample

file = data_path + pts[0]
p_signal, atr_sym, atr_sample = load_ecg(file)

values, counts = np.unique(sym, return_counts=True)


def make_dataset(pts, num_sec, fs, abnormal):
    # function for making dataset ignoring non-beats
    # input:
    # pts - list of patients
    # num_sec = number of seconds to include before and after the beat
    # fs = frequency
    # output:
    #   X_all = signal (nbeats , num_sec * fs columns)
    #   Y_all = binary is abnormal (nbeats, 1)
    #   sym_all = beat annotation symbol (nbeats,1)

    # initialize numpy arrays
    num_cols = int(2 * num_sec * fs)
    X_all = np.zeros((1, num_cols))
    Y_all = np.zeros((1, 1))
    sym_all = []

    # list to keep track of number of beats across patients
    max_rows = []

    for pt in pts:
        file = data_path + pt

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
        left = max([0, int(atr_sample - num_sec * fs)])
        right = min([len(p_signal), int(atr_sample + num_sec * fs)])
        x = p_signal[left: right]
        if len(x) == num_cols:
            X[max_row, :] = x
            Y[max_row, :] = int(atr_sym in abnormal)
            sym.append(atr_sym)
            max_row += 1
    X = X[:max_row, :]
    Y = Y[:max_row, :]
    return X, Y, sym

num_sec = 0.3
fs = 360
X_all, Y_all, sym_all = make_dataset(pts, num_sec, fs, abnormal)

import random
random.seed(42)
pts_train = random.sample(pts, 36)
pts_valid = [pt for pt in pts if pt not in pts_train]
print(len(pts_train),len(pts_valid))

X_train, y_train, sym_train = make_dataset(pts_train, num_sec, fs, abnormal)
X_valid, y_valid, sym_valid = make_dataset(pts_valid, num_sec, fs, abnormal)
print(X_train.shape, y_train.shape, len(sym_train))
print(X_valid.shape, y_valid.shape, len(sym_valid))

model = Sequential()
model.add(Dense(32, activation = 'relu', input_dim = X_train.shape[1]))
model.add(Dropout(rate = 0.25))
model.add(Dense(1, activation = 'sigmoid'))

model.compile(
    loss='binary_crossentropy',
    optimizer='adam',
    metrics=['accuracy']
)
history = model.fit(X_train, y_train, batch_size = 32, epochs =15, verbose=1,validation_data=(X_valid, y_valid))

y_pred = model.predict(X_valid)
# Saving model to disk
#pickle.dump(model, open('model.pkl','wb'))
# Loading model to compare the results
#model = pickle.load(open('model.pkl','rb'))
model.save('saved_models/my_model')
## load tensorflow model
model = keras.models.load_model('saved_models/my_model')