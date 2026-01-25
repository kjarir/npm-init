import 'package:bobpay/common/profile.dart';
import 'package:flutter/material.dart';
import '../screens/client_dashboard.dart';
import '../screens/project_detail.dart';
import '../screens/browse_freelancers.dart';
import '../screens/client_wallet.dart';

class ClientNavigation extends StatefulWidget {
  const ClientNavigation({super.key});

  @override
  State<ClientNavigation> createState() => _ClientNavigationState();
}

class _ClientNavigationState extends State<ClientNavigation> {
  int _currentIndex = 0;

  final List<Widget> _screens = const [
    ClientDashboard(),
    ProjectDetailsPage(),
    BrowseFreelancer(),
    Profile(),
  ];

  final List<String> _labels = [
    'HOME',
    'PROJECT',
    'SEARCH',
    'PROFILE',
  ];

  final List<IconData> _icons = [
    Icons.grid_view,
    Icons.folder_outlined,
    Icons.search,
    Icons.person_outline,
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(
        index: _currentIndex,
        children: _screens,
      ),
      bottomNavigationBar: Container(
        height: 70,
        decoration: BoxDecoration(
          color: Colors.white,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.1),
              blurRadius: 4,
              offset: const Offset(0, -2),
            ),
          ],
        ),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 8.0),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: List.generate(
                _screens.length,
                (index) => GestureDetector(
                  onTap: () {
                    setState(() {
                      _currentIndex = index;
                    });
                  },
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        _icons[index],
                        color: _currentIndex == index 
                            ? const Color(0xFFE36F4C) 
                            : const Color(0xFF757575),
                        size: 24,
                      ),
                      const SizedBox(height: 4),
                      Text(
                        _labels[index],
                        style: TextStyle(
                          color: _currentIndex == index 
                              ? const Color(0xFFE36F4C) 
                              : const Color(0xFF757575),
                          fontSize: 12,
                          fontWeight: _currentIndex == index 
                              ? FontWeight.w600 
                              : FontWeight.normal,
                          letterSpacing: 0.5,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
