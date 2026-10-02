import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const image = formData.get('image')

    if (!image || !(image instanceof File)) {
      return NextResponse.json(
        { error: 'No image provided' },
        { status: 400 }
      )
    }

    // Check file size (max 5MB)
    if (image.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Image too large. Maximum size is 5MB.' },
        { status: 400 }
      )
    }

    // Check file type
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp']
    if (!validTypes.includes(image.type)) {
      return NextResponse.json(
        { error: 'Invalid image format. Please use JPEG, PNG, or WebP.' },
        { status: 400 }
      )
    }

    // Convert image to base64
    const arrayBuffer = await image.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const base64 = buffer.toString('base64')

    // Get API key from environment variables
    const apiKey = process.env.GOOGLE_VISION_API_KEY

    if (!apiKey) {
      console.error('❌ GOOGLE_VISION_API_KEY not found')
      return NextResponse.json({
        wasteType: 'Unknown',
        confidence: 0,
        error: 'API key not configured. Please set GOOGLE_VISION_API_KEY in .env.local',
        source: 'error'
      })
    }

    console.log('✅ Calling Google Vision API...')

    // Call Google Cloud Vision API with detailed features
    const visionResponse = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [
            {
              image: {
                content: base64,
              },
              features: [
                { type: 'LABEL_DETECTION', maxResults: 20 },
                { type: 'OBJECT_LOCALIZATION', maxResults: 15 },
                { type: 'WEB_DETECTION', maxResults: 10 },
              ],
            },
          ],
        }),
      }
    )

    // Check if API call was successful
    if (!visionResponse.ok) {
      const errorData = await visionResponse.json()
      console.error('❌ Google Vision API Error:', errorData)
      
      // Check specific error types
      if (visionResponse.status === 403) {
        return NextResponse.json({
          wasteType: 'Unknown',
          confidence: 0,
          error: 'API key is invalid or has insufficient permissions. Please check your Google Cloud Vision API settings.',
          source: 'error'
        }, { status: 403 })
      }
      
      if (visionResponse.status === 429) {
        return NextResponse.json({
          wasteType: 'Unknown',
          confidence: 0,
          error: 'API quota exceeded. Free tier is 1000 requests per month.',
          source: 'error'
        }, { status: 429 })
      }

      return NextResponse.json({
        wasteType: 'Unknown',
        confidence: 0,
        error: 'Failed to classify image. Please try again.',
        source: 'error'
      }, { status: visionResponse.status })
    }

    const visionData = await visionResponse.json()
    const labels = visionData.responses?.[0]?.labelAnnotations || []
    const objects = visionData.responses?.[0]?.localizedObjectAnnotations || []
    const webEntities = visionData.responses?.[0]?.webDetection?.webEntities || []

    console.log('📷 Labels found:', labels.length)
    console.log('📦 Objects found:', objects.length)
    console.log('🌐 Web entities found:', webEntities.length)

    // Log all labels for debugging
    if (labels.length > 0) {
      console.log('🏷️ Labels:')
      labels.slice(0, 10).forEach((l: any) => {
        console.log(`   - ${l.description}: ${(l.score * 100).toFixed(1)}%`)
      })
    }

    // Log all objects for debugging
    if (objects.length > 0) {
      console.log('📦 Objects:')
      objects.slice(0, 10).forEach((o: any) => {
        console.log(`   - ${o.name}: ${(o.score * 100).toFixed(1)}%`)
      })
    }

    // If no labels or objects found - return Unknown instead of guessing
    if (labels.length === 0 && objects.length === 0) {
      console.log('⚠️ No labels or objects found by Vision API')
      return NextResponse.json({
        wasteType: 'Unknown',
        confidence: 0,
        error: 'No objects or labels detected in the image. Please try a clearer photo.',
        source: 'no-detection'
      })
    }

    // ============================================
    // DETECTION LOGIC - BASED ON IMAGE CONTENT
    // ============================================
    
    // Define waste type keywords with confidence weights
    const plasticKeywords = [
      { word: 'plastic', weight: 1.0 },
      { word: 'bottle', weight: 0.9 },
      { word: 'container', weight: 0.7 },
      { word: 'bag', weight: 0.7 },
      { word: 'wrap', weight: 0.6 },
      { word: 'packaging', weight: 0.8 },
      { word: 'cup', weight: 0.7 },
      { word: 'plate', weight: 0.6 },
      { word: 'straw', weight: 0.8 },
      { word: 'lid', weight: 0.6 },
      { word: 'foam', weight: 0.7 },
      { word: 'styrofoam', weight: 0.9 },
      { word: 'polyethylene', weight: 1.0 },
      { word: 'polypropylene', weight: 1.0 },
      { word: 'polyester', weight: 0.9 },
      { word: 'polymer', weight: 0.9 },
      { word: 'vinyl', weight: 0.8 },
      { word: 'pet', weight: 0.7 },
      { word: 'water bottle', weight: 1.0 },
      { word: 'soda bottle', weight: 1.0 },
      { word: 'juice bottle', weight: 0.9 },
      { word: 'drink bottle', weight: 0.9 },
      { word: 'shampoo bottle', weight: 0.9 },
      { word: 'detergent bottle', weight: 0.9 },
      { word: 'milk jug', weight: 0.8 },
      { word: 'takeout container', weight: 0.8 },
      { word: 'tupperware', weight: 0.8 },
      { word: 'grocery bag', weight: 0.7 },
      { word: 'trash bag', weight: 0.7 },
      { word: 'plastic wrap', weight: 0.8 },
      { word: 'cling film', weight: 0.8 },
      { word: 'bubble wrap', weight: 0.7 },
      { word: 'pokari sweat', weight: 0.9 },
      { word: 'pocari sweat', weight: 0.9 },
    ]

    const metalKeywords = [
      { word: 'metal', weight: 1.0 },
      { word: 'aluminum', weight: 0.9 },
      { word: 'aluminium', weight: 0.9 },
      { word: 'steel', weight: 0.9 },
      { word: 'stainless steel', weight: 0.9 },
      { word: 'iron', weight: 0.9 },
      { word: 'copper', weight: 0.9 },
      { word: 'brass', weight: 0.8 },
      { word: 'tin', weight: 0.8 },
      { word: 'can', weight: 0.9 },
      { word: 'aluminum can', weight: 1.0 },
      { word: 'tin can', weight: 0.9 },
      { word: 'soda can', weight: 0.9 },
      { word: 'beer can', weight: 0.9 },
      { word: 'foil', weight: 0.8 },
      { word: 'aluminum foil', weight: 0.9 },
      { word: 'tin foil', weight: 0.8 },
      { word: 'pan', weight: 0.7 },
      { word: 'pot', weight: 0.7 },
      { word: 'tool', weight: 0.6 },
      { word: 'wrench', weight: 0.6 },
      { word: 'screwdriver', weight: 0.6 },
      { word: 'screw', weight: 0.6 },
      { word: 'nail', weight: 0.6 },
      { word: 'key', weight: 0.6 },
      { word: 'coin', weight: 0.6 },
      { word: 'wire', weight: 0.7 },
      { word: 'pipe', weight: 0.7 },
      { word: 'scrap metal', weight: 1.0 },
    ]

    const paperKeywords = [
      { word: 'paper', weight: 1.0 },
      { word: 'cardboard', weight: 1.0 },
      { word: 'paperboard', weight: 0.9 },
      { word: 'card stock', weight: 0.8 },
      { word: 'pulp', weight: 0.8 },
      { word: 'newspaper', weight: 0.9 },
      { word: 'magazine', weight: 0.9 },
      { word: 'book', weight: 0.8 },
      { word: 'notebook', weight: 0.8 },
      { word: 'journal', weight: 0.8 },
      { word: 'document', weight: 0.7 },
      { word: 'letter', weight: 0.7 },
      { word: 'envelope', weight: 0.8 },
      { word: 'flyer', weight: 0.7 },
      { word: 'brochure', weight: 0.7 },
      { word: 'paper bag', weight: 0.9 },
      { word: 'gift wrap', weight: 0.7 },
      { word: 'wrapping paper', weight: 0.8 },
      { word: 'box', weight: 0.8 },
      { word: 'cardboard box', weight: 1.0 },
      { word: 'corrugated box', weight: 0.9 },
      { word: 'cereal box', weight: 0.8 },
      { word: 'shoe box', weight: 0.8 },
      { word: 'pizza box', weight: 0.8 },
      { word: 'egg carton', weight: 0.8 },
      { word: 'paper plate', weight: 0.8 },
      { word: 'paper cup', weight: 0.8 },
      { word: 'paper towel', weight: 0.8 },
      { word: 'toilet paper', weight: 0.8 },
      { word: 'napkin', weight: 0.7 },
      { word: 'printer paper', weight: 0.8 },
      { word: 'copy paper', weight: 0.8 },
    ]

    // Track scores with weights
    let plasticScore = 0
    let metalScore = 0
    let paperScore = 0
    let plasticMatches: string[] = []
    let metalMatches: string[] = []
    let paperMatches: string[] = []

    // Function to check matches with weights
    function checkMatches(text: string, score: number, keywords: { word: string, weight: number }[], type: string) {
      const lowerText = text.toLowerCase()
      for (const kw of keywords) {
        if (lowerText.includes(kw.word) || kw.word.includes(lowerText)) {
          const weightedScore = score * kw.weight
          if (type === 'plastic') {
            plasticScore += weightedScore
            plasticMatches.push(kw.word)
          } else if (type === 'metal') {
            metalScore += weightedScore
            metalMatches.push(kw.word)
          } else if (type === 'paper') {
            paperScore += weightedScore
            paperMatches.push(kw.word)
          }
          return true
        }
      }
      return false
    }

    // Check OBJECT DETECTION (highest priority)
    for (const obj of objects) {
      const objName = (obj.name || '').toLowerCase()
      const objScore = obj.score || 0
      
      // Check against all types
      const isPlastic = checkMatches(objName, objScore, plasticKeywords, 'plastic')
      const isMetal = checkMatches(objName, objScore, metalKeywords, 'metal')
      const isPaper = checkMatches(objName, objScore, paperKeywords, 'paper')
    }

    // Check LABEL DETECTION
    for (const label of labels) {
      const labelText = (label.description || '').toLowerCase()
      const labelScore = label.score || 0
      
      checkMatches(labelText, labelScore, plasticKeywords, 'plastic')
      checkMatches(labelText, labelScore, metalKeywords, 'metal')
      checkMatches(labelText, labelScore, paperKeywords, 'paper')
    }

    // Check WEB ENTITIES (helps with brand/product recognition)
    for (const entity of webEntities) {
      const entityDesc = (entity.description || '').toLowerCase()
      const entityScore = (entity.score || 0) * 0.5 // Lower weight for web entities
      
      // Check for brand names that indicate type
      if (entityDesc.includes('pocari') || entityDesc.includes('pokari') || entityDesc.includes('sweat')) {
        plasticScore += 0.8
        plasticMatches.push('pokari sweat')
      }
    }

    // Calculate average scores (normalize by number of matches)
    const plasticAvg = plasticMatches.length > 0 ? plasticScore / plasticMatches.length : 0
    const metalAvg = metalMatches.length > 0 ? metalScore / metalMatches.length : 0
    const paperAvg = paperMatches.length > 0 ? paperScore / paperMatches.length : 0

    console.log(`📊 Detected matches:`)
    console.log(`   Plastic: ${plasticMatches.length} matches, score: ${(plasticAvg * 100).toFixed(1)}%`)
    console.log(`   Metal: ${metalMatches.length} matches, score: ${(metalAvg * 100).toFixed(1)}%`)
    console.log(`   Paper: ${paperMatches.length} matches, score: ${(paperAvg * 100).toFixed(1)}%`)

    // Determine the winner
    let detectedType = 'Unknown'
    let detectedConfidence = 0
    let detectedLabels: string[] = []

    // Priority 1: If there's a clear winner with high confidence
    const maxScore = Math.max(plasticAvg, metalAvg, paperAvg)
    
    if (maxScore > 0.3) {
      if (plasticAvg >= metalAvg && plasticAvg >= paperAvg && plasticAvg > 0.3) {
        detectedType = 'Plastic'
        detectedConfidence = Math.min(plasticAvg, 1.0)
        detectedLabels = plasticMatches.slice(0, 5)
      } else if (metalAvg >= plasticAvg && metalAvg >= paperAvg && metalAvg > 0.3) {
        detectedType = 'Metal'
        detectedConfidence = Math.min(metalAvg, 1.0)
        detectedLabels = metalMatches.slice(0, 5)
      } else if (paperAvg >= plasticAvg && paperAvg >= metalAvg && paperAvg > 0.3) {
        detectedType = 'Paper'
        detectedConfidence = Math.min(paperAvg, 1.0)
        detectedLabels = paperMatches.slice(0, 5)
      }
    }

    // Priority 2: Special case - check if "bottle" appears with high confidence
    const hasBottle = labels.some((l: any) => 
      (l.description || '').toLowerCase().includes('bottle')
    ) || objects.some((o: any) => 
      (o.name || '').toLowerCase().includes('bottle')
    )

    if (hasBottle && detectedType === 'Unknown') {
      detectedType = 'Plastic'
      detectedConfidence = 0.7
      detectedLabels = ['bottle']
    }

    // Priority 3: Check if "can" appears
    const hasCan = labels.some((l: any) => 
      (l.description || '').toLowerCase().includes('can') && 
      !(l.description || '').toLowerCase().includes('candy')
    ) || objects.some((o: any) => 
      (o.name || '').toLowerCase().includes('can')
    )

    if (hasCan && detectedType === 'Unknown') {
      detectedType = 'Metal'
      detectedConfidence = 0.7
      detectedLabels = ['can']
    }

    // Priority 4: Check if "cardboard" or "box" appears
    const hasPaper = labels.some((l: any) => 
      (l.description || '').toLowerCase().includes('cardboard') ||
      (l.description || '').toLowerCase().includes('box') ||
      (l.description || '').toLowerCase().includes('paper')
    ) || objects.some((o: any) => 
      (o.name || '').toLowerCase().includes('cardboard') ||
      (o.name || '').toLowerCase().includes('box')
    )

    if (hasPaper && detectedType === 'Unknown') {
      detectedType = 'Paper'
      detectedConfidence = 0.7
      detectedLabels = ['cardboard/box']
    }

    // If still Unknown, return Unknown (don't guess)
    if (detectedType === 'Unknown') {
      console.log('⚠️ No confident detection, returning Unknown')
      return NextResponse.json({
        wasteType: 'Unknown',
        confidence: 0,
        labels: labels.slice(0, 10).map((label: { description?: string; score?: number }) => ({
          description: label.description || '',
          score: Math.round((label.score || 0) * 100) / 100
        })),
        objects: objects.slice(0, 5).map((obj: any) => ({
          name: obj.name || '',
          score: Math.round((obj.score || 0) * 100) / 100
        })),
        source: 'unknown',
        message: 'Could not determine waste type from image. Please try a clearer photo.'
      })
    }

    console.log(`✅ Detected: ${detectedType} (${(detectedConfidence * 100).toFixed(1)}%)`)

    return NextResponse.json({
      wasteType: detectedType,
      confidence: Math.round(detectedConfidence * 100) / 100,
      labels: labels.slice(0, 10).map((label: { description?: string; score?: number }) => ({
        description: label.description || '',
        score: Math.round((label.score || 0) * 100) / 100
      })),
      detectedItems: detectedLabels,
      source: 'google-vision',
      scores: {
        plastic: Math.round(plasticAvg * 100) / 100,
        metal: Math.round(metalAvg * 100) / 100,
        paper: Math.round(paperAvg * 100) / 100
      }
    })

  } catch (error) {
    console.error('❌ Classification error:', error)
    return NextResponse.json({
      wasteType: 'Unknown',
      confidence: 0,
      error: 'An error occurred during classification. Please try again.',
      source: 'error'
    }, { status: 500 })
  }
}