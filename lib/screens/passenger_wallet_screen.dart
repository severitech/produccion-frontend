import 'package:flutter/material.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:url_launcher/url_launcher.dart';
import '../services/billetera_service.dart';

class PasajeroWalletScreen extends StatefulWidget {
  final BilleteraService billeteraService;
  const PasajeroWalletScreen({Key? key, required this.billeteraService}) : super(key: key);

  @override
  State<PasajeroWalletScreen> createState() => _PasajeroWalletScreenState();
}

class _PasajeroWalletScreenState extends State<PasajeroWalletScreen> {
  late PageController _pageController;
  int _tab = 0;
  Map<String, dynamic>? billetera;
  String? qr;
  int segundos = 0;
  double monto = 20;
  List<Map<String, dynamic>> historial = [];
  bool cargando = true;

  @override
  void initState() {
    super.initState();
    _pageController = PageController();
    _cargarBilletera();
  }

  void _cargarBilletera() async {
    try {
      final data = await widget.billeteraService.miBilletera();
      setState(() {
        billetera = data;
        cargando = false;
      });
    } catch (e) {
      setState(() => cargando = false);
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
    }
  }

  void _generarQr() async {
    try {
      final data = await widget.billeteraService.generarQr();
      setState(() {
        qr = data['qr'];
        segundos = data['expiraEnSeg'] ?? 90;
      });
      _iniciarCuenta();
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
    }
  }

  void _iniciarCuenta() {
    Future.delayed(Duration(seconds: 1), () {
      if (mounted && segundos > 0) {
        setState(() => segundos--);
        if (segundos > 0) _iniciarCuenta();
        else setState(() => qr = null);
      }
    });
  }

  void _irAStripe() async {
    try {
      final data = await widget.billeteraService.stripeCheckout(monto);
      if (data['url'] != null) {
        if (await canLaunchUrl(Uri.parse(data['url']))) {
          await launchUrl(Uri.parse(data['url']), mode: LaunchMode.externalApplication);
        }
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
    }
  }

  void _cargarHistorial() async {
    try {
      final data = await widget.billeteraService.miHistorial();
      setState(() => historial = List<Map<String, dynamic>>.from(data));
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
    }
  }

  @override
  Widget build(BuildContext context) {
    final saldo = billetera?['saldoBs'] ?? 0.0;
    final categoria = billetera?['categoria'] ?? 'GENERAL';

    return Scaffold(
      body: cargando
          ? Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              child: Column(
                children: [
                  SizedBox(height: 20),
                  Container(
                    margin: EdgeInsets.symmetric(horizontal: 16),
                    padding: EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      gradient: LinearGradient(colors: [Color(0xFF00d992), Color(0xFF00a966)]),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Mi Billetera', style: TextStyle(color: Colors.white70, fontSize: 14)),
                        SizedBox(height: 8),
                        Text('Bs ${saldo.toStringAsFixed(2)}', style: TextStyle(color: Colors.white, fontSize: 36, fontWeight: FontWeight.bold)),
                        SizedBox(height: 12),
                        Container(
                          padding: EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                          decoration: BoxDecoration(color: Colors.white12, borderRadius: BorderRadius.circular(8)),
                          child: Text(categoria, style: TextStyle(color: Colors.white, fontSize: 12)),
                        ),
                      ],
                    ),
                  ),
                  SizedBox(height: 24),
                  Padding(
                    padding: EdgeInsets.symmetric(horizontal: 16),
                    child: Row(
                      children: [
                        Expanded(child: _tabBtn(0, '💳 Pagar')),
                        SizedBox(width: 12),
                        Expanded(child: _tabBtn(1, '➕ Recargar')),
                        SizedBox(width: 12),
                        Expanded(child: _tabBtn(2, '📋 Historial')),
                      ],
                    ),
                  ),
                  SizedBox(height: 20),
                  if (_tab == 0) _tabPagar(),
                  if (_tab == 1) _tabRecargar(),
                  if (_tab == 2) _tabHistorial(),
                  SizedBox(height: 40),
                ],
              ),
            ),
    );
  }

  Widget _tabBtn(int idx, String label) => GestureDetector(
        onTap: () {
          setState(() => _tab = idx);
          if (idx == 2) _cargarHistorial();
        },
        child: Container(
          padding: EdgeInsets.symmetric(vertical: 12),
          decoration: BoxDecoration(
            color: _tab == idx ? Color(0xFF00d992) : Colors.grey[800],
            borderRadius: BorderRadius.circular(8),
          ),
          child: Text(label, textAlign: TextAlign.center, style: TextStyle(color: _tab == idx ? Colors.black : Colors.white, fontWeight: FontWeight.bold, fontSize: 12)),
        ),
      );

  Widget _tabPagar() => Padding(
        padding: EdgeInsets.symmetric(horizontal: 16),
        child: Column(
          children: [
            if (qr != null) ...[
              Container(
                padding: EdgeInsets.all(20),
                decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12)),
                child: QrImage(data: qr!, version: QrVersions.auto, size: 250),
              ),
              SizedBox(height: 12),
              Text('Expira en ${segundos}s', style: TextStyle(color: segundos <= 15 ? Colors.red : Colors.grey, fontWeight: FontWeight.bold)),
              SizedBox(height: 16),
              ElevatedButton(onPressed: _generarQr, child: Text('🔄 Nuevo QR'), style: ElevatedButton.styleFrom(backgroundColor: Colors.grey[700])),
            ] else
              ElevatedButton(onPressed: _generarQr, child: Text('📱 Mostrar QR'), style: ElevatedButton.styleFrom(backgroundColor: Color(0xFF00d992), foregroundColor: Colors.black)),
          ],
        ),
      );

  Widget _tabRecargar() => Padding(
        padding: EdgeInsets.symmetric(horizontal: 16),
        child: Column(
          children: [
            Container(
              padding: EdgeInsets.all(16),
              decoration: BoxDecoration(color: Colors.grey[900], borderRadius: BorderRadius.circular(12)),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Monto (Bs)', style: TextStyle(color: Colors.grey[400], fontSize: 12)),
                  SizedBox(height: 8),
                  TextField(
                    keyboardType: TextInputType.number,
                    onChanged: (v) => setState(() => monto = double.tryParse(v) ?? 20),
                    decoration: InputDecoration(
                      hintText: '20',
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                      contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    ),
                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                  ),
                  SizedBox(height: 16),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: _irAStripe,
                      child: Text('💳 Pagar Bs ${monto.toStringAsFixed(2)}'),
                      style: ElevatedButton.styleFrom(backgroundColor: Color(0xFF635bff), foregroundColor: Colors.white, padding: EdgeInsets.symmetric(vertical: 14)),
                    ),
                  ),
                  SizedBox(height: 8),
                  Text('Tarjeta prueba: 4242 4242 4242 4242', style: TextStyle(color: Colors.grey[600], fontSize: 11)),
                ],
              ),
            ),
          ],
        ),
      );

  Widget _tabHistorial() => Padding(
        padding: EdgeInsets.symmetric(horizontal: 16),
        child: historial.isEmpty
            ? Center(child: Text('Sin movimientos', style: TextStyle(color: Colors.grey)))
            : ListView.builder(
                shrinkWrap: true,
                physics: NeverScrollableScrollPhysics(),
                itemCount: historial.length,
                itemBuilder: (_, i) {
                  final m = historial[i];
                  return Container(
                    margin: EdgeInsets.only(bottom: 8),
                    padding: EdgeInsets.all(12),
                    decoration: BoxDecoration(color: Colors.grey[900], borderRadius: BorderRadius.circular(8)),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(m['tipo'] ?? '', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
                            Text(m['fecha'] ?? '', style: TextStyle(fontSize: 12, color: Colors.grey)),
                          ],
                        ),
                        Text('Bs ${(m['montoBs'] ?? 0).toStringAsFixed(2)}', style: TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF00d992))),
                      ],
                    ),
                  );
                },
              ),
      );

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }
}
