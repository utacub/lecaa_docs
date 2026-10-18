# Builds a tiny ONNX model with the same inputs as Matxa v2: x, x_lengths, scales, spks.
# As in the BSC demo (spaces/BSC-LT/matxa-tts-v2, app.py), the waveform is the second output;
# the first is a stand-in mel spectrogram. Waveform: noise, 256 samples per input symbol.
import sys, onnx
from onnx import helper as h, TensorProto as T
nodes = [
  h.make_node('Shape', ['x'], ['sx']),
  h.make_node('Constant', [], ['k'], value=h.make_tensor('k', T.INT64, [2], [1, 256])),
  h.make_node('Mul', ['sx', 'k'], ['shape']),
  h.make_node('ConstantOfShape', ['shape'], ['zeros'], value=h.make_tensor('v', T.FLOAT, [1], [0.0])),
  h.make_node('RandomNormalLike', ['zeros'], ['noise'], scale=0.1),
  h.make_node('Slice', ['scales', 'z0', 'z1'], ['temp']),
  h.make_node('Mul', ['noise', 'temp'], ['wav']),
  h.make_node('Constant', [], ['k80'], value=h.make_tensor('k80', T.INT64, [2], [1, 80])),
  h.make_node('Slice', ['sx', 'z1', 'z2'], ['t']),
  h.make_node('Concat', ['k80', 't'], ['mshape'], axis=0),
  h.make_node('ConstantOfShape', ['mshape'], ['mel'], value=h.make_tensor('m', T.FLOAT, [1], [-5.0])),
]
inits = [h.make_tensor('z0', T.INT64, [1], [0]), h.make_tensor('z1', T.INT64, [1], [1]), h.make_tensor('z2', T.INT64, [1], [2])]
g = h.make_graph(nodes, 'fake_matxa',
  [h.make_tensor_value_info('x', T.INT64, ['b', 't']), h.make_tensor_value_info('x_lengths', T.INT64, ['b']),
   h.make_tensor_value_info('scales', T.FLOAT, [2]), h.make_tensor_value_info('spks', T.INT64, ['b'])],
  [h.make_tensor_value_info('mel', T.FLOAT, ['b', 80, 't']), h.make_tensor_value_info('wav', T.FLOAT, ['b', 'n'])], inits)
m = h.make_model(g, opset_imports=[h.make_opsetid('', 15)])
m.ir_version = 8
onnx.checker.check_model(m)
onnx.save(m, sys.argv[1])
