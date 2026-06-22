import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:geolocator/geolocator.dart';
import '../services/billetera_service.dart';

class ConductorScanScreen extends StatefulWidget {
  final BilleteraService billeteraService;
  const ConductorScanScreen({Key? key, required this.billeteraService}) : super(key: key);

  @override
  State<ConductorScanScreen> createState() => _ConductorScanScreenState();
}

class _ConductorScanScreenState extends State<ConductorScanScreen> {
  late MobileScannerController cameraController;
  StreamSubscription<Position>? positionStream;
  bool escaneando = true;
  String? ultimoQr;
  bool procesando = false;
  String lineaId = '';

  @override
  void initState() {
    super.initState();
    cameraController = MobileScannerController();
    _iniciarUbicacion();
  }

  void _iniciarUbicacion() async {
    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Activa ubicación')));
      return;
    }

    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }

    if (permission == LocationPermission.whileInUse || permission == LocationPermission.always) {
      positionStream = Geolocator.getPositionStream(
        locationSettings: LocationSettings(accuracy: LocationAccuracy.best, distanceFilter: 10),
      ).listen((Position position) {
        // Ubicación actualizada en background, no interrumpe el escaneo
      });
    }
  }

  void _procesarQr(String qr) async {
    if (procesando || ultimoQr == qr) return;

    setState(() {
      procesando = true;
      ultimoQr = qr;
    });

    try {
      final resultado = await widget.billeteraService.pagar(lineaId);
      _mostrarExito(resultado);
    } catch (e) {
      _mostrarError('Error: $e');
    } finally {
      setState(() => procesando = false);
      await Future.delayed(Duration(seconds: 2));
      setState(() {
        ultimoQr = null;
        escaneando = true;
      });
    }
  }

  void _mostrarExito(Map<String, dynamic> resultado) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: Colors.grey[900],
        title: Text('✅ Pago realizado', style: TextStyle(color: Colors.green)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Pasajero pagó correctamente', style: TextStyle(color: Colors.white)),
            SizedBox(height: 8),
            Text('Tarifa: Bs ${resultado['tarifaBaseBs'] ?? 0}', style: TextStyle(color: Colors.grey[400], fontSize: 12)),
            Text('Descuento: Bs ${resultado['descuentoBs'] ?? 0}', style: TextStyle(color: Colors.grey[400], fontSize: 12)),
          ],
        ),
        actions: [ElevatedButton(onPressed: () => Navigator.pop(context), child: Text('OK'))],
      ),
    );
  }

  void _mostrarError(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg), backgroundColor: Colors.red));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Escanear QR'),
        backgroundColor: Color(0xFF1a1a1a),
        centerTitle: true,
      ),
      body: Stack(
        children: [
          if (escaneando && !procesando)
            MobileScanner(
              controller: cameraController,
              onDetect: (capture) {
                final List<Barcode> barcodes = capture.barcodes;
                for (final barcode in barcodes) {
                  if (barcode.rawValue != null && barcode.rawValue!.isNotEmpty) {
                    setState(() => escaneando = false);
                    _procesarQr(barcode.rawValue!);
                  }
                }
              },
            )
          else if (procesando)
            Container(
              color: Colors.black.withOpacity(0.8),
              child: Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    CircularProgressIndicator(color: Color(0xFF00d992)),
                    SizedBox(height: 16),
                    Text('Procesando pago...', style: TextStyle(color: Colors.white)),
                  ],
                ),
              ),
            )
          else
            Container(color: Colors.black),
          Positioned(
            top: 20,
            left: 20,
            right: 20,
            child: Container(
              padding: EdgeInsets.all(16),
              decoration: BoxDecoration(color: Colors.black87, borderRadius: BorderRadius.circular(12)),
              child: Column(
                children: [
                  Text('Línea:', style: TextStyle(color: Colors.grey[400], fontSize: 12)),
                  SizedBox(height: 8),
                  TextField(
                    onChanged: (v) => setState(() => lineaId = v),
                    decoration: InputDecoration(
                      hintText: 'ID de línea',
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                      contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    ),
                    style: TextStyle(color: Colors.white),
                  ),
                ],
              ),
            ),
          ),
          Positioned(
            bottom: 30,
            left: 20,
            right: 20,
            child: Container(
              padding: EdgeInsets.all(16),
              decoration: BoxDecoration(color: Colors.black87, borderRadius: BorderRadius.circular(12)),
              child: Column(
                children: [
                  Text(escaneando ? '📱 Apunta el QR del pasajero' : procesando ? '⏳ Procesando...' : '✅ Pago completado',
                      textAlign: TextAlign.center, style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14)),
                  SizedBox(height: 12),
                  if (escaneando)
                    ElevatedButton(onPressed: () async => await cameraController.toggleTorch(), child: Text('💡 Flash'), style: ElevatedButton.styleFrom(backgroundColor: Colors.grey[700])),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  @override
  void dispose() {
    cameraController.dispose();
    positionStream?.cancel();
    super.dispose();
  }
}
