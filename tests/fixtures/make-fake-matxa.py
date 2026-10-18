# Builds a tiny ONNX model with the same interface as Matxa v2 (matcha/onnx/export.py):
# x, x_lengths, scales, spks -> wav, wav_lengths. Output: noise, 256 samples per input symbol.
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
  h.make_node('Constant', [], ['k256'], value=h.make_tensor('k256', T.INT64, [1], [256])),
  h.make_node('Mul', ['x_lengths', 'k256'], ['wav_lengths']),
]
inits = [h.make_tensor('z0', T.INT64, [1], [0]), h.make_tensor('z1', T.INT64, [1], [1])]
g = h.make_graph(nodes, 'fake_matxa',
  [h.make_tensor_value_info('x', T.INT64, ['b', 't']), h.make_tensor_value_info('x_lengths', T.INT64, ['b']),
   h.make_tensor_value_info('scales', T.FLOAT, [2]), h.make_tensor_value_info('spks', T.INT64, ['b'])],
  [h.make_tensor_value_info('wav', T.FLOAT, ['b', 'n']), h.make_tensor_value_info('wav_lengths', T.INT64, ['b'])], inits)
m = h.make_model(g, opset_imports=[h.make_opsetid('', 15)])
m.ir_version = 8
onnx.checker.check_model(m)
onnx.save(m, sys.argv[1])
