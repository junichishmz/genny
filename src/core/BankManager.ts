/**
 * Bank Manager for Genny 2.0
 * Manages sample bank prefixes and aliases
 */

export class BankManager {
  private static instance: BankManager
  private bankAliases: Map<string, string> = new Map()
  private soundMappings: Map<string, Map<string, string>> = new Map()
  private defaultBank: string | null = null
  
  private constructor() {
    this.initializeAliases()
    this.initializeSoundMappings()
  }
  
  static getInstance(): BankManager {
    if (!BankManager.instance) {
      BankManager.instance = new BankManager()
    }
    return BankManager.instance
  }
  
  /**
   * Initialize default bank aliases
   */
  private initializeAliases(): void {
    // TR-808 family
    this.addAlias('808', '808')
    this.addAlias('tr808', '808')
    this.addAlias('TR808', '808')
    this.addAlias('RolandTR808', '808')
    
    // TR-909 family  
    this.addAlias('909', '909')
    this.addAlias('tr909', '909')
    this.addAlias('TR909', '909')
    this.addAlias('RolandTR909', '909')
    
    // Other Roland drum machines available in samples
    this.addAlias('dr55', 'dr55')
    this.addAlias('DR55', 'dr55')
    this.addAlias('dr2', 'dr2')
    this.addAlias('DR2', 'dr2')
    this.addAlias('dr110', 'dr2')       // dr2 contains DR110 samples
    
    // Drum machine collections
    this.addAlias('drumtraks', 'drumtraks')
    this.addAlias('DrumTraks', 'drumtraks')
    this.addAlias('dt', 'drumtraks')
    
    // Elektron machines
    this.addAlias('electro1', 'electro1')
    this.addAlias('electro', 'electro1')
    
    // Generic drum sets
    this.addAlias('drum', 'drum')
    this.addAlias('drums', 'drum')
    this.addAlias('kit', 'drum')
    
    // Breaks and loops
    this.addAlias('breaks125', 'breaks125')
    this.addAlias('breaks152', 'breaks152') 
    this.addAlias('breaks157', 'breaks157')
    this.addAlias('breaks165', 'breaks165')
    this.addAlias('amen', 'breaks152')    // breaks152 contains amen break
    
    // Alternative drum sets from the sample library
    this.addAlias('db', 'db')             // DBS12 drum set
    this.addAlias('dbs12', 'db')
    this.addAlias('ab', 'ab')             // AB2 drum set  
    this.addAlias('ab2', 'ab')
    this.addAlias('auto', 'auto')         // Breakbeat-style drums
    this.addAlias('feel', 'feel')         // Feel drums
    this.addAlias('gretsch', 'gretsch')   // Gretsch drum kit
  }
  
  /**
   * Initialize sound mappings for each bank
   */
  private initializeSoundMappings(): void {
    // 808 mappings - use the separate 808bd and 808sd collections
    const mapping808 = new Map<string, string>()
    mapping808.set('bd', '808bd')  // Use 808bd collection for bass drums
    mapping808.set('sd', '808sd')  // Use 808sd collection for snare drums
    mapping808.set('sn', '808sd')  // Alias for snare
    mapping808.set('hh', '808hc')  // Use 808hc for closed hi-hat
    mapping808.set('oh', '808oh')  // Use 808oh for open hi-hat
    mapping808.set('cb', '808')    // Cowbell is in main 808 collection (CB.WAV)
    mapping808.set('cp', '808')    // Clap is in main 808 collection (CP.WAV)
    mapping808.set('cy', '808cy')  // Cymbal from 808cy collection
    mapping808.set('ht', '808ht')  // Hi-tom from 808ht collection
    mapping808.set('mt', '808mt')  // Mid-tom from 808mt collection
    mapping808.set('lt', '808lt')  // Low-tom from 808lt collection
    this.soundMappings.set('808', mapping808)
    
    // 909 mappings - only has one sample, so map everything to it
    const mapping909 = new Map<string, string>()
    mapping909.set('bd', '909')    // Map bass drum to the single 909 sample
    mapping909.set('sn', '909')    // Map snare to the single 909 sample
    mapping909.set('sd', '909')    // Map snare to the single 909 sample
    this.soundMappings.set('909', mapping909)
    
    // electro1 mappings
    const mappingElectro1 = new Map<string, string>()
    mappingElectro1.set('bd', 'electro1')  // Will use et1kick1.wav, et1kick2.wav
    mappingElectro1.set('sn', 'electro1')  // Will use et1snare1.wav, et1snare2.wav
    mappingElectro1.set('sd', 'electro1')  // Alias for snare
    mappingElectro1.set('hh', 'electro1')  // Will use et1closedhh.wav
    mappingElectro1.set('oh', 'electro1')  // Will use et1openhh.wav
    mappingElectro1.set('cp', 'electro1')  // Various percussion sounds
    mappingElectro1.set('perc', 'electro1') // Percussion
    this.soundMappings.set('electro1', mappingElectro1)
    
    // gretsch mappings
    const mappingGretsch = new Map<string, string>()
    mappingGretsch.set('bd', 'gretsch')    // Will use kick.wav
    mappingGretsch.set('sn', 'gretsch')    // Will use snare.wav
    mappingGretsch.set('sd', 'gretsch')    // Alias for snare
    mappingGretsch.set('hh', 'gretsch')    // Will use closedhat.wav
    mappingGretsch.set('oh', 'gretsch')    // Will use openhat.wav
    mappingGretsch.set('ht', 'gretsch')    // Will use hitom.wav
    mappingGretsch.set('lt', 'gretsch')    // Will use lotom.wav
    mappingGretsch.set('cb', 'gretsch')    // Will use cowbell.wav
    mappingGretsch.set('ride', 'gretsch')  // Will use ridecymbal.wav
    this.soundMappings.set('gretsch', mappingGretsch)
    
    // drumtraks mappings
    const mappingDrumtraks = new Map<string, string>()
    mappingDrumtraks.set('bd', 'drumtraks')    // Will use DT Kick.wav
    mappingDrumtraks.set('sn', 'drumtraks')    // Will use DT Snare.wav
    mappingDrumtraks.set('sd', 'drumtraks')    // Alias for snare
    mappingDrumtraks.set('hh', 'drumtraks')    // Will use DT Hat Closed.wav
    mappingDrumtraks.set('oh', 'drumtraks')    // Will use DT Hat Open.wav
    mappingDrumtraks.set('cp', 'drumtraks')    // Will use DT Claps.wav
    mappingDrumtraks.set('cb', 'drumtraks')    // Will use DT Cowbell.wav
    mappingDrumtraks.set('ride', 'drumtraks')  // Will use DT Ride.wav
    this.soundMappings.set('drumtraks', mappingDrumtraks)
    
    // db mappings
    const mappingDb = new Map<string, string>()
    mappingDb.set('bd', 'db')      // Will use dbs12kick1.wav, dbs12kick2.wav
    mappingDb.set('sn', 'db')      // Will use dbs12snare1.wav, dbs12snare2.wav
    mappingDb.set('sd', 'db')      // Alias for snare
    mappingDb.set('hh', 'db')      // Will use dbs12closedhh.wav
    mappingDb.set('oh', 'db')      // Will use dbs12openhh.wav
    mappingDb.set('ride', 'db')    // Will use dbs12ride.wav
    this.soundMappings.set('db', mappingDb)
    
    // feel mappings
    const mappingFeel = new Map<string, string>()
    mappingFeel.set('bd', 'feel')      // Will use BD 04 d.wav
    mappingFeel.set('sn', 'feel')      // Will use Sd 139.wav, Sd 180.wav, Sd 223.wav
    mappingFeel.set('sd', 'feel')      // Alias for snare
    mappingFeel.set('hh', 'feel')      // Will use HH 003b.wav, hihat029a.wav
    this.soundMappings.set('feel', mappingFeel)
    
    // auto mappings (breakbeat style)
    const mappingAuto = new Map<string, string>()
    mappingAuto.set('bd', 'auto')      // Will use break-kick.wav, kick.wav, kick-ambient.wav
    mappingAuto.set('sn', 'auto')      // Will use break-sd.wav, sd.wav, sd-ambient.wav
    mappingAuto.set('sd', 'auto')      // Alias for snare
    mappingAuto.set('ride', 'auto')    // Will use break-ride.wav
    this.soundMappings.set('auto', mappingAuto)
  }
  
  /**
   * Add a bank alias
   */
  addAlias(alias: string, bankName: string): void {
    this.bankAliases.set(alias, bankName)
  }
  
  /**
   * Resolve a bank name (handle aliases)
   */
  resolveBank(bank: string): string {
    return this.bankAliases.get(bank) || bank
  }
  
  /**
   * Apply bank prefix to a pattern
   */
  applyBankToPattern(pattern: string, bankName: string | null): string {
    if (!bankName) return pattern
    
    const resolvedBank = this.resolveBank(bankName)
    const bankMappings = this.soundMappings.get(resolvedBank)
    
    // Parse the pattern and apply bank mapping to each sound
    const tokens = this.tokenizePattern(pattern)
    
    return tokens.map(token => {
      if (this.isSoundToken(token)) {
        // Parse the sound token to handle repetition and colon notation
        const { sound: baseSoundName } = this.parseSoundToken(token)
        
        // Don't remap if sound already has underscore (already has bank)
        if (baseSoundName.includes('_')) {
          return token
        }
        
        // Use the sound mapping if available
        if (bankMappings && bankMappings.has(baseSoundName)) {
          const mappedCollection = bankMappings.get(baseSoundName)!
          // Replace the base sound name but keep any repetition/colon notation
          return token.replace(baseSoundName, mappedCollection)
        }
        
        // Fallback to old behavior if no mapping found
        return `${resolvedBank}_${token}`
      }
      return token
    }).join(' ')
  }
  
  /**
   * Tokenize a pattern string
   */
  private tokenizePattern(pattern: string): string[] {
    // Handle brackets, tildes, and other mini-notation symbols
    const tokens: string[] = []
    let current = ''
    let inBracket = false
    
    for (let i = 0; i < pattern.length; i++) {
      const char = pattern[i]
      
      if (char === '[') {
        if (current) {
          tokens.push(current)
          current = ''
        }
        tokens.push('[')
        inBracket = true
      } else if (char === ']') {
        if (current) {
          tokens.push(current)
          current = ''
        }
        tokens.push(']')
        inBracket = false
      } else if (char === ' ' && !inBracket) {
        if (current) {
          tokens.push(current)
          current = ''
        }
      } else if (char === '~') {
        if (current) {
          tokens.push(current)
          current = ''
        }
        tokens.push('~')
      } else if (char === '*' || char === '/' || char === ',') {
        // Handle repetition and other operators
        current += char
      } else {
        current += char
      }
    }
    
    if (current) {
      tokens.push(current)
    }
    
    return tokens
  }
  
  /**
   * Check if a token is a sound name
   */
  private isSoundToken(token: string): boolean {
    // Skip special characters and operators
    if (token === '~' || token === '[' || token === ']' || token === ',') {
      return false
    }
    
    // Skip if it's a number or contains only operators
    if (/^\d+$/.test(token) || /^[*\/\-+]+$/.test(token)) {
      return false
    }
    
    // Check for repetition syntax (e.g., "bd*4")
    const baseSound = token.split('*')[0].split('/')[0]
    
    // Common sound names that should get bank prefix
    const soundNames = [
      'bd', 'sd', 'sn', 'hh', 'oh', 'cp', 'rim', 'lt', 'mt', 'ht',
      'cym', 'crash', 'ride', 'cb', 'mar', 'clv', 'perc',
      'kick', 'snare', 'hihat', 'openhat', 'clap', 'tom', 'cymbal'
    ]
    
    return soundNames.includes(baseSound.toLowerCase())
  }
  
  /**
   * Parse sound token with repetition syntax and sample index
   */
  private parseSoundToken(token: string): { sound: string, repetitions: number, sampleIndex?: number } {
    let sound = token.trim()
    let repetitions = 1
    let sampleIndex: number | undefined
    
    // Handle repetition syntax (bd*4)
    if (sound.includes('*')) {
      const parts = sound.split('*')
      sound = parts[0].trim()
      const repsStr = parts[1].trim()
      repetitions = parseInt(repsStr) || 1
    }
    
    // Handle colon notation (hh:2)
    if (sound.includes(':')) {
      const parts = sound.split(':')
      sound = parts[0].trim()
      const indexStr = parts[1].trim()
      sampleIndex = parseInt(indexStr) || 0
    }
    
    return { sound, repetitions, sampleIndex }
  }
  
  /**
   * Set default bank
   */
  setDefaultBank(bankName: string | null): void {
    this.defaultBank = bankName ? this.resolveBank(bankName) : null
  }
  
  /**
   * Get default bank
   */
  getDefaultBank(): string | null {
    return this.defaultBank
  }
  
  /**
   * List all available banks
   */
  listBanks(): string[] {
    const banks = new Set<string>()
    
    // Add primary drum machine banks (that actually exist in samples)
    banks.add('808')
    banks.add('909') 
    banks.add('dr55')
    banks.add('dr2')
    banks.add('drumtraks')
    banks.add('electro1')
    banks.add('drum')
    banks.add('db')
    banks.add('ab')
    banks.add('auto')
    banks.add('feel')
    banks.add('gretsch')
    
    // Add breakbeat collections
    banks.add('breaks125')
    banks.add('breaks152')
    banks.add('breaks157')
    banks.add('breaks165')
    
    // Add commonly used aliases
    banks.add('tr808')
    banks.add('tr909')
    banks.add('amen')
    banks.add('electro')
    banks.add('drums')
    banks.add('kit')
    
    return Array.from(banks).sort()
  }
  
  /**
   * Get all aliases for a bank
   */
  getBankAliases(bankName: string): string[] {
    const aliases: string[] = []
    
    this.bankAliases.forEach((bank, alias) => {
      if (bank === bankName) {
        aliases.push(alias)
      }
    })
    
    return aliases
  }
  
  /**
   * Check if a sound name is actually a bank name
   */
  isBankName(soundName: string): boolean {
    return this.bankAliases.has(soundName) || this.soundMappings.has(soundName)
  }
  
  /**
   * Get all available bank names (including aliases)
   */
  getAllBankNames(): string[] {
    const bankNames = new Set<string>()
    
    // Add resolved bank names
    this.soundMappings.forEach((_, bankName) => {
      bankNames.add(bankName)
    })
    
    // Add all aliases
    this.bankAliases.forEach((_, alias) => {
      bankNames.add(alias)
    })
    
    return Array.from(bankNames).sort()
  }
}

// Singleton instance
const bankManager = BankManager.getInstance()
export default bankManager