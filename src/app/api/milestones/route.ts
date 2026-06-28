import { NextResponse } from 'next/server';
import { checkAndNotifyMilestones, getTotalRecoveredCents } from '@/lib/milestones';
import { createClient } from '@/lib/supabase-server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get total recovered (can filter by profile or show global)
    const totalCents = await getTotalRecoveredCents();

    // Fetch milestone records
    const { data: milestones } = await supabase
      .from('recovery_milestones')
      .select('*')
      .order('threshold_cents', { ascending: true });

    return NextResponse.json({
      total_recovered_cents: totalCents,
      total_recovered_formatted: new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(totalCents / 100),
      milestones: milestones || [],
      next_milestone: getNextMilestone(totalCents),
    });
  } catch (error: any) {
    console.error('[Milestones API] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * POST endpoint: Explicitly trigger milestone check.
 * Designed to be called after recovery events (webhooks, manual sync completion).
 */
export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await checkAndNotifyMilestones();

    return NextResponse.json({
      checked: result.checked,
      total_cents: result.totalCents,
      milestones_notified: result.milestonesNotified,
      errors: result.errors.length > 0 ? result.errors : undefined,
    });
  } catch (error: any) {
    console.error('[Milestones API POST] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

function getNextMilestone(totalCents: number): { label: string; cents: number; remaining_cents: number } | null {
  const milestones = [
    { label: '$100', cents: 10000 },
    { label: '$500', cents: 50000 },
    { label: '$1,000', cents: 100000 },
  ];

  for (const m of milestones) {
    if (totalCents < m.cents) {
      return {
        label: m.label,
        cents: m.cents,
        remaining_cents: m.cents - totalCents,
      };
    }
  }
  return null; // All milestones reached
}

export const dynamic = 'force-dynamic';