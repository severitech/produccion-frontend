import 'package:dio/dio.dart';

class BilleteraService {
  final Dio dio;
  BilleteraService(this.dio);

  Future<Map<String, dynamic>> miBilletera() async {
    final r = await dio.get('/billetera');
    return r.data;
  }

  Future<Map<String, dynamic>> generarQr() async {
    final r = await dio.get('/billetera/qr');
    return r.data;
  }

  Future<Map<String, dynamic>> pagar(String lineaId) async {
    final r = await dio.post('/billetera/pagar', data: {'lineaId': lineaId});
    return r.data;
  }

  Future<Map<String, dynamic>> stripeCheckout(double monto) async {
    final r = await dio.post('/billetera/stripe/checkout', data: {'monto': monto});
    return r.data;
  }

  Future<Map<String, dynamic>> stripeConfirmar(String sessionId) async {
    final r = await dio.post('/billetera/stripe/confirmar', data: {'sessionId': sessionId});
    return r.data;
  }

  Future<Map<String, dynamic>> miHistorial() async {
    final r = await dio.get('/billetera/historial');
    return r.data;
  }
}
