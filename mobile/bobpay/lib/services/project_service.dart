import 'package:flutter/foundation.dart';
import 'package:bobpay/services/supabase_client.dart';

/// Project Service
/// Handles project-related data fetching
class ProjectService {
  /// Get all projects for the current logged-in client
  /// Returns: {success, projects, error}
  static Future<Map<String, dynamic>> getClientProjects() async {
    try {
      if (!SupabaseService.isInitialized) {
        return {
          'success': false,
          'error': 'Supabase not initialized',
        };
      }

      final user = SupabaseService.client.auth.currentUser;
      if (user == null) {
        return {
          'success': false,
          'error': 'No user logged in',
        };
      }

      debugPrint('📁 [PROJECTS] Fetching projects for client: ${user.id}');

      // Fetch projects where client_id matches current user
      final projectsResponse = await SupabaseService.client
          .from('projects')
          .select('''
            *,
            freelancer:profiles!projects_freelancer_id_fkey(id, full_name, email, avatar_url)
          ''')
          .eq('client_id', user.id)
          .order('created_at', ascending: false);

      debugPrint('✅ [PROJECTS] Retrieved ${projectsResponse.length} projects');
      return {
        'success': true,
        'projects': List<Map<String, dynamic>>.from(projectsResponse),
      };
    } catch (e, stackTrace) {
      debugPrint('❌ [PROJECTS] ERROR: $e');
      debugPrint('❌ [PROJECTS] Stack trace: $stackTrace');
      return {
        'success': false,
        'error': 'Failed to fetch projects: $e',
      };
    }
  }

  /// Get active projects count
  static Future<int> getActiveProjectsCount() async {
    try {
      final user = SupabaseService.client.auth.currentUser;
      if (user == null) return 0;

      final response = await SupabaseService.client
          .from('projects')
          .select('id')
          .eq('client_id', user.id);

      // Filter active statuses manually (using valid enum values)
      final activeStatuses = ['draft', 'open', 'in_progress'];
      final filtered = (response as List).where((p) {
        final status = p['status']?.toString().toLowerCase();
        return activeStatuses.contains(status);
      }).toList();

      return filtered.length;
    } catch (e) {
      return 0;
    }
  }

  /// Get total escrow amount (sum of locked_funds)
  static Future<double> getTotalEscrow() async {
    try {
      final user = SupabaseService.client.auth.currentUser;
      if (user == null) return 0.0;

      final response = await SupabaseService.client
          .from('projects')
          .select('locked_funds')
          .eq('client_id', user.id);

      double total = 0.0;
      for (var project in response) {
        final locked = project['locked_funds'];
        if (locked != null) {
          if (locked is String) {
            total += double.tryParse(locked) ?? 0.0;
          } else if (locked is num) {
            total += locked.toDouble();
          }
        }
      }

      return total;
    } catch (e) {
      return 0.0;
    }
  }

  /// Get all available projects for freelancers to browse.
  /// Shows projects with freelancer_id IS NULL. Requires RLS: run supabase_rls_fix_projects.sql.
  static Future<Map<String, dynamic>> getAllAvailableProjects() async {
    try {
      if (!SupabaseService.isInitialized) {
        return {'success': false, 'error': 'Supabase not initialized'};
      }
      final user = SupabaseService.client.auth.currentUser;
      if (user == null) {
        return {'success': false, 'error': 'No user logged in'};
      }
      debugPrint('📁 [PROJECTS] Fetching available projects (user: ${user.id})');

      final projectsResponse = await SupabaseService.client
          .from('projects')
          .select('*')
          .order('created_at', ascending: false)
          .limit(100);

      final all = List<Map<String, dynamic>>.from(projectsResponse as List);
      final unassigned = all.where((p) => p['freelancer_id'] == null).toList();

      debugPrint('✅ [PROJECTS] Fetched ${all.length} total, ${unassigned.length} unassigned');
      return {'success': true, 'projects': unassigned};
    } catch (e, stackTrace) {
      debugPrint('❌ [PROJECTS] Error: $e');
      debugPrint('❌ [PROJECTS] $stackTrace');
      return {
        'success': false,
        'error': 'Failed to fetch projects. Run supabase_rls_fix_projects.sql in Supabase SQL Editor if freelancers see no projects.',
      };
    }
  }

  /// Get project by ID with milestones
  static Future<Map<String, dynamic>?> getProjectById(String projectId) async {
    try {
      final response = await SupabaseService.client
          .from('projects')
          .select('''
            *,
            freelancer:profiles!projects_freelancer_id_fkey(id, full_name, email, avatar_url),
            client:profiles!projects_client_id_fkey(id, full_name, email, avatar_url),
            milestones:milestones(*)
          ''')
          .eq('id', projectId)
          .maybeSingle();

      if (response != null) {
        return Map<String, dynamic>.from(response);
      }
      return null;
    } catch (e) {
      debugPrint('Error fetching project: $e');
      return null;
    }
  }
}
