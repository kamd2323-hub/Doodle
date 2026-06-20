import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const openaiApiKey = process.env.OPENAI_API_KEY
    const resendApiKey = process.env.RESEND_API_KEY

    const isOpenAIConfigured = !!openaiApiKey && 
                               openaiApiKey !== 'your-openai-api-key' && 
                               !openaiApiKey.startsWith('mock_') && 
                               !openaiApiKey.includes('placeholder')

    const isResendConfigured = !!resendApiKey && 
                               resendApiKey !== 'your-resend-api-key' && 
                               !resendApiKey.startsWith('mock_') && 
                               !resendApiKey.includes('placeholder')

    // Check if the user has any active integrations
    const { data: connections } = await supabase
      .from('oauth_connections')
      .select('id')
      .eq('profile_id', user.id)
      .eq('status', 'active')

    const hasActiveIntegration = connections && connections.length > 0

    return NextResponse.json({
      isLive: isOpenAIConfigured && isResendConfigured && hasActiveIntegration,
      config: {
        openai: isOpenAIConfigured,
        resend: isResendConfigured,
        integration: hasActiveIntegration
      }
    })
  } catch (error: any) {
    console.error('Config status error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
