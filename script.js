/* ==========================================================================
   ALAKSIEJ - GAMEPLAY DEVELOPER PORTFOLIO
   Interactive Client Script
   ========================================================================== */

// --- 1. CODE SNIPPETS DATABASE (FROM REAL PROJECT REPOSITORIES) ---
const CODE_SNIPPETS = {
  'spawn-service': {
    title: 'Polymorphic ScriptableObject Spawner Architecture (Jetpack Runner / 2DV_5)',
    description: 'Generic base class SpawnService<TSpawnData> deriving from AbstractSpawnService ScriptableObject. Decouples spawner behavior from scene managers, supports custom runtime parameters (angles, scale variation), and injects via pure VContainer without singletons.',
    badges: ['Template Method', 'ScriptableObject', 'VContainer DI', 'Generics <T>'],
    code: `// Lab.Managers.Spawn.Services.AbstractSpawnService.cs
using Lab.Pooling;
using UnityEngine;

namespace Lab.Managers.Spawn.Services
{
    public abstract class AbstractSpawnService : ScriptableObject
    {
        public abstract void Spawn(PoolService poolService, SpawnContext spawnContext);
    }
}

// Lab.Managers.Spawn.Services.SpawnService.cs
using Lab.Managers.Spawn.Data;
using Lab.Pooling;
using UnityEngine;

namespace Lab.Managers.Spawn.Services
{
    public class SpawnService<TSpawnData> : AbstractSpawnService
        where TSpawnData : SpawnData
    {
        [SerializeField] protected TSpawnData spawnData;

        public sealed override void Spawn(PoolService poolService, SpawnContext spawnContext)
        {
            for (int i = 0; i < spawnData.SpawnCount; i++)
            {
                if (poolService.TryGet(spawnData.Prefab, out var entity))
                    SpawnEntity(entity, spawnContext);
            }
        }

        protected virtual void SpawnEntity(PooledEntity entity, SpawnContext spawnContext)
        {
            float x = spawnContext.PlayerTransform.position.x +
                      Random.Range(spawnData.MinXDist, spawnData.MaxXDist);
            float y = Random.Range(spawnData.MinY, spawnData.MaxY);

            entity.transform.position = new Vector3(x, y, 0f);
        }
    }
}

// Lab.Managers.Spawn.Services.LaserSpawnService.cs
namespace Lab.Managers.Spawn.Services
{
    [CreateAssetMenu(fileName = "LaserSpawnService", menuName = "Lab/Spawn/Laser Spawn Service")]
    public class LaserSpawnService : SpawnService<LaserSpawnData>
    {
        protected override void SpawnEntity(PooledEntity entity, SpawnContext spawnContext)
        {
            base.SpawnEntity(entity, spawnContext);

            var entityTransform = entity.transform;

            // Randomized obstacle angle & height scaling for varied gameplay
            float angle = Random.Range(spawnData.MinAngle, spawnData.MaxAngle);
            entityTransform.rotation = Quaternion.Euler(0f, 0f, angle);

            float scale = Random.Range(spawnData.MinScaleY, spawnData.MaxScaleY);
            entityTransform.localScale = new Vector3(entityTransform.localScale.x, scale, entityTransform.localScale.z);
        }
    }
}`
  },

  'weighted-random': {
    title: 'Reusable Generic Weighted Random Collection (Sunflower)',
    description: 'My custom generic WeightedRandomList<T> implementing IReadOnlyList<T>. Features inspector serialization, cumulative probability weights, runtime dynamic weighting, and empty drop probability calculation. Written for my GameJam winner project.',
    badges: ['Generics <T>', 'IReadOnlyList<T>', 'Serialization', 'Game Design Math'],
    code: `using System.Collections;
using System.Collections.Generic;
using UnityEngine;

namespace Sunflower.Utilities.WeightedRandom
{
    [System.Serializable]
    public class WeightedRandomList<T> : IReadOnlyList<T>
    {
        [System.Serializable]
        private class WeightedItem
        {
            [SerializeField] private T _value;
            [Min(0f)]
            [Tooltip("Probability, relative to other items in the collection")]
            [SerializeField] private float _probability;

            public T Value { get => _value; set => _value = value; }
            public float Probability { get => _probability; set => _probability = value; }

            public WeightedItem(T value, float probability)
            {
                _value = value;
                _probability = probability;
            }
        }

        [Header("Items")]
        [SerializeField] private List<WeightedItem> _collection = new();

        [Header("Empty")]
        [Tooltip("Relative probability of returning nothing")]
        [SerializeField] private float _emptyProbability = 10f;

        private float? _probabilityWeight = null;

        public int Count => _collection.Count;

        public float ProbabilityWeight
        {
            get
            {
                if (_probabilityWeight == null)
                    CalculateWeight();
                return (float)_probabilityWeight;
            }
        }

        public T GetRandomItem()
        {
            if (_collection.Count == 0)
                return default;

            if (_probabilityWeight == null)
                CalculateWeight();

            float randomValue = Random.Range(0, (float)_probabilityWeight);
            float currentProbability = 0f;

            foreach (var item in _collection)
            {
                currentProbability += item.Probability;
                if (randomValue < currentProbability)
                    return item.Value;
            }

            return default; // Returns null/default if empty weight rolled
        }

        private void CalculateWeight()
        {
            _probabilityWeight = 0f;
            foreach (var item in _collection)
                _probabilityWeight += item.Probability;

            _probabilityWeight += _emptyProbability;
        }

        public T this[int index] => _collection[index].Value;
        public IEnumerator<T> GetEnumerator() { foreach (var item in _collection) yield return item.Value; }
        IEnumerator IEnumerable.GetEnumerator() => GetEnumerator();
    }
}`
  },

  'pool-service': {
    title: 'Resolver-Integrated Object Pooling Engine (Sky Battle / 2DV_4)',
    description: 'Custom ObjectPool integrated with VContainer IObjectResolver. Resolves DI dependencies on freshly instantiated pooled entities, organizes hierarchy transforms, and provides pooled entity recycling.',
    badges: ['VContainer IObjectResolver', 'Allocation Control', 'Hierarchy Cleanliness'],
    code: `using System.Collections.Generic;
using UnityEngine;
using VContainer;
using VContainer.Unity;

namespace Lab.Pooling
{
    public class PoolService : IInitializable
    {
        private readonly PoolData[] _datas;
        private readonly IObjectResolver _resolver;
        private readonly Dictionary<PooledEntity, ObjectPool> _pools = new();

        public PoolService(PoolData[] datas, IObjectResolver resolver)
        {
            _datas = datas;
            _resolver = resolver;
        }

        public void Initialize()
        {
            var root = new GameObject("Pools").transform;

            foreach (var data in _datas)
            {
                if (_pools.ContainsKey(data.Prefab))
                {
                    Debug.LogWarning($"Pool for {data.Prefab.name} already exists. Skipping.");
                    continue;
                }

                var parent = new GameObject($"{data.Prefab.name} Pool").transform;
                parent.SetParent(root);
                _pools.Add(data.Prefab, new ObjectPool(data, parent, _resolver));
            }
        }

        public bool TryGet(PooledEntity prefab, out PooledEntity entity)
        {
            if (_pools.TryGetValue(prefab, out var pool))
            {
                pool.TryGet(out entity);
                return true;
            }

            Debug.LogError($"No registered pool for prefab: {prefab.name}");
            entity = null;
            return false;
        }
    }

    public class ObjectPool
    {
        private readonly PoolData _data;
        private readonly Transform _parent;
        private readonly IObjectResolver _resolver;
        private readonly Queue<PooledEntity> _pool = new();

        public ObjectPool(PoolData data, Transform parent, IObjectResolver resolver)
        {
            _data = data;
            _parent = parent;
            _resolver = resolver;

            for (int i = 0; i < _data.PoolSize; i++)
                _pool.Enqueue(CreateInstance());
        }

        public bool TryGet(out PooledEntity entity)
        {
            if (_pool.Count == 0)
            {
                if (!_data.CanGrow)
                {
                    entity = null;
                    return false;
                }
                _pool.Enqueue(CreateInstance());
            }

            entity = _pool.Dequeue();
            entity.gameObject.SetActive(true);
            entity.OnSpawn();
            return true;
        }

        private PooledEntity CreateInstance()
        {
            // DI Resolver instantiates and injects all constructor dependencies
            var instance = _resolver.Instantiate(_data.Prefab, _parent);
            instance.Bind(this);
            instance.gameObject.SetActive(false);
            return instance;
        }
    }
}`
  },

  'card-interaction': {
    title: 'Event-Driven Card State & Interaction (Fable Pairs / 2DV_3)',
    description: 'Clean separation of input raycasting (IPointerClickHandler), card animation with cached WaitForSeconds, and decoupled completion events (Action OnAllPairsUsed) wired with VContainer.',
    badges: ['Event-Driven (Action)', 'IPointerClickHandler', 'Cached Yield', 'VContainer DI'],
    code: `using Lab.State.Move;
using System.Collections;
using UnityEngine;
using UnityEngine.EventSystems;
using VContainer;

namespace Lab.Cards
{
    [RequireComponent(typeof(Card))]
    public class CardInteraction : MonoBehaviour, IPointerClickHandler
    {
        [SerializeField] private float _flipDelayTime = 0.5f;

        [Inject] private CurrentMove _currentMove;

        private Card _card;
        private bool _isFlipped;
        private Coroutine _cardFlip;
        private WaitForSeconds _flipDelay;

        private void Awake()
        {
            _card = GetComponent<Card>();
            _flipDelay = new WaitForSeconds(_flipDelayTime);
        }

        private void OnDisable() => StopAllCoroutines();

        public void OnPointerClick(PointerEventData eventData)
        {
            if (_isFlipped || _cardFlip != null)
                return;

            _card.FlipUpwards();
            _currentMove.AddCard(_card);
            _isFlipped = true;
        }

        public void OnMoveFinished(bool success)
        {
            if (!success)
                _cardFlip = StartCoroutine(CardFlipBackwardsDelay());
            else
                _card.FinalizeState();
        }

        private IEnumerator CardFlipBackwardsDelay()
        {
            yield return _flipDelay;
            _card.FlipBackwards();
            _isFlipped = false;
            _cardFlip = null;
        }
    }
}

// Lab.State.Cards.UsedPairs.cs
namespace Lab.State.Cards
{
    public class UsedPairs
    {
        [Inject] private SpawnConfig _spawnConfig;
        private int _usedPairsCount = 0;

        // Decoupled event notifying listeners when all cards are resolved
        public event System.Action OnAllPairsUsed;

        public void AddUsedPair()
        {
            _usedPairsCount++;
            if (_usedPairsCount == _spawnConfig.FrontSprites.Count)
                OnAllPairsUsed?.Invoke();
        }
    }
}`
  },

  'health-interfaces': {
    title: 'Decoupled Combat Interfaces & Safety Validation',
    description: 'Decoupling damage reception (IHittable) from death reaction (IDeathHandler). Uses event-driven damage notifications, encapsulated backing fields, and #if UNITY_EDITOR OnValidate() to guarantee component integrity in the editor.',
    badges: ['Event-Driven (Action)', 'Interface Segregation', 'OnValidate Safety'],
    code: `using System;
using UnityEngine;

namespace Relentless.HealthSystem
{
    public interface IHittable
    {
        void React(float damage);
    }

    public interface IDeathHandler
    {
        void Die();
    }

    [AddComponentMenu("Relentless/Health/Health")]
    public class Health : MonoBehaviour, IHittable
    {
        [SerializeField] private float _maxHealth = 100f;
        public float MaxHealth => _maxHealth;
        public float CurrentHealth { get; private set; }

        private IDeathHandler _deathHandler;
        public event Action OnDamageTaken;

        private void Awake() => _deathHandler = GetComponent(typeof(IDeathHandler)) as IDeathHandler;

        protected virtual void OnEnable() => CurrentHealth = _maxHealth;

        public void React(float damage)
        {
            CurrentHealth = Mathf.Max(0f, CurrentHealth - damage);
            OnDamageTaken?.Invoke();

            if (CurrentHealth <= 0f)
                _deathHandler?.Die();
        }

#if UNITY_EDITOR
        private void OnValidate()
        {
            if (GetComponent(typeof(IDeathHandler)) as IDeathHandler == null)
                Debug.LogError($"[{name}]: Required IDeathHandler component is not attached!", this);
        }
#endif
    }
}`
  }
};

// --- 2. SINGLE-PASS C# SYNTAX HIGHLIGHTER (FIXES CLASS="CS-ATTR" BUG) ---
function highlightCSharp(code) {
  // First escape HTML entities
  const escaped = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Single-pass regex using group alternation:
  // 1: Comments (//...)
  // 2: Attributes ([...])
  // 3: Strings ("...")
  // 4: Keywords
  // 5: Types
  // 6: Numbers
  const tokenRegex = /(\/\/[^\n]*)|(\[[A-Za-z0-9_,\s\(\)\.\=\+\-\*\"\'&;]+\])|("(?:\\.|[^"\\])*")|\b(using|namespace|public|protected|private|sealed|abstract|virtual|override|class|interface|struct|where|new|out|ref|return|base|this|get|set|yield|while|for|foreach|in|if|else|continue|default|event|readonly|static|const|typeof|as|is)\b|\b(void|int|float|string|bool|var|Transform|Vector3|Vector2|Quaternion|GameObject|MonoBehaviour|ScriptableObject|IReadOnlyList|List|Queue|Dictionary|IEnumerator|IObjectResolver|PoolService|PooledEntity|SpawnContext|SpawnData|LaserSpawnData|IHittable|IDeathHandler|Health|Action|Random|Sprite|SpriteRenderer|RequireComponent|AddComponentMenu|CreateAssetMenu|WaitForSeconds|WaitUntil|Coroutine|PointerEventData|IPointerClickHandler)\b|\b(\d+(\.\d+)?[fF]?)\b/g;

  return escaped.replace(tokenRegex, (match, comment, attr, str, kw, type, num) => {
    if (comment) return `<span class="cs-comment">${comment}</span>`;
    if (attr) return `<span class="cs-attr">${attr}</span>`;
    if (str) return `<span class="cs-str">${str}</span>`;
    if (kw) return `<span class="cs-kw">${kw}</span>`;
    if (type) return `<span class="cs-type">${type}</span>`;
    if (num) return `<span class="cs-num">${num}</span>`;
    return match;
  });
}

function loadCodeSnippet(key) {
  const data = CODE_SNIPPETS[key];
  if (!data) return;

  // Update tabs active state
  document.querySelectorAll('.code-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === key);
  });

  // Update banner
  const metaTitle = document.getElementById('meta-title');
  const metaDesc = document.getElementById('meta-desc');
  const metaBadges = document.getElementById('meta-badges');
  const codeDisplay = document.getElementById('code-display');

  if (metaTitle) metaTitle.textContent = data.title;
  if (metaDesc) metaDesc.textContent = data.description;
  
  if (metaBadges) {
    metaBadges.innerHTML = data.badges.map(b => 
      `<span class="tech-badge">${b}</span>`
    ).join('');
  }

  if (codeDisplay) {
    codeDisplay.innerHTML = highlightCSharp(data.code);
  }
}

function openCodeSnippet(snippetKey) {
  loadCodeSnippet(snippetKey);
  const target = document.getElementById('architecture');
  if (target) {
    target.scrollIntoView({ behavior: 'smooth' });
  }
}

// --- 3. PROJECT FILTERING ---
function initProjectFilters() {
  const filterBtns = document.querySelectorAll('.filter-btn');
  const projectCards = document.querySelectorAll('.project-card');

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const filter = btn.getAttribute('data-filter');

      projectCards.forEach(card => {
        const categories = card.getAttribute('data-category') || '';
        if (filter === 'all' || categories.includes(filter)) {
          card.style.display = card.classList.contains('featured') ? 'grid' : 'flex';
          setTimeout(() => {
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
          }, 10);
        } else {
          card.style.opacity = '0';
          card.style.transform = 'translateY(10px)';
          setTimeout(() => {
            card.style.display = 'none';
          }, 200);
        }
      });
    });
  });
}

// --- 4. MEDIA IMAGE/GIF SWITCHING ---
function initMediaSwitchTabs() {
  const tabContainers = document.querySelectorAll('.media-switch-tabs');

  tabContainers.forEach(container => {
    const targetId = container.getAttribute('data-target');
    const targetImg = document.getElementById(targetId);
    const buttons = container.querySelectorAll('.media-tab-btn');

    buttons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        buttons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const newSrc = btn.getAttribute('data-src');
        if (targetImg && newSrc) {
          targetImg.style.opacity = '0.3';
          setTimeout(() => {
            targetImg.src = newSrc;
            targetImg.style.opacity = '1';
          }, 150);
        }
      });
    });
  });
}

// --- 5. INTERACTIVE SUNFLOWER GROWTH SIMULATOR (ALL 9 AUTHENTIC STAGES) ---
const SunflowerSim = {
  water: 75,
  sun: 60,
  minerals: 85,
  height: 5.0,
  stage: 1,
  evoMultiplier: 0, // preview: points you would get if you reset right now
  evoPoints: 0,     // banked total, only changes on meta reset

  // Single source of truth for the start state, also used by metaReset()
  initialState: { water: 75, sun: 60, minerals: 85, height: 5.0 },

  // Growth thresholds matching GrowthStagesData ScriptableObject
  stageThresholds: [
    { stage: 1, maxHeight: 15.0, sprite: 'assets/projects/sunflower/sunflower9.png', label: 'Stage 1: Soil Sprout' },
    { stage: 2, maxHeight: 30.0, sprite: 'assets/projects/sunflower/sunflower8.png', label: 'Stage 2: Rising Stem' },
    { stage: 3, maxHeight: 45.0, sprite: 'assets/projects/sunflower/sunflower7.png', label: 'Stage 3: Leaf Emergence' },
    { stage: 4, maxHeight: 60.0, sprite: 'assets/projects/sunflower/sunflower6.png', label: 'Stage 4: Elongation' },
    { stage: 5, maxHeight: 80.0, sprite: 'assets/projects/sunflower/sunflower5.png', label: 'Stage 5: Bud Forming' },
    { stage: 6, maxHeight: 105.0, sprite: 'assets/projects/sunflower/sunflower4.png', label: 'Stage 6: Expanding Head' },
    { stage: 7, maxHeight: 130.0, sprite: 'assets/projects/sunflower/sunflower3.png', label: 'Stage 7: Petals Opening' },
    { stage: 8, maxHeight: 160.0, sprite: 'assets/projects/sunflower/sunflower2.png', label: 'Stage 8: Mature Sunflower' },
    { stage: 9, maxHeight: 999.0, sprite: 'assets/projects/sunflower/sunflower1.png', label: 'Stage 9: Giant Sky Bloom' }
  ],

  init() {
    this.bindButtons();
    this.startDecayLoop();
    this.updateStage();
    this.render();
  },

  bindButtons() {
    const btnWater = document.getElementById('btn-water');
    const btnSun = document.getElementById('btn-sun');
    const btnMinerals = document.getElementById('btn-minerals');
    const btnReset = document.getElementById('btn-reset-evo');

    if (btnWater) btnWater.addEventListener('click', () => this.feed('water', 25));
    if (btnSun) btnSun.addEventListener('click', () => this.feed('sun', 25));
    if (btnMinerals) btnMinerals.addEventListener('click', () => this.feed('minerals', 25));
    if (btnReset) btnReset.addEventListener('click', () => this.metaReset());
  },

  // Unity: (int)(1 / 9f * Mathf.Pow(x, Mathf.Log(3, 2) * 1.2f)), where x = height
  calcEvoPoints(height) {
    const exponent = Math.log2(3) * 1.2;
    return Math.max(0, Math.floor((1 / 9) * Math.pow(height, exponent)));
  },

  feed(type, amount) {
    this[type] = Math.min(100, this[type] + amount);
    this.updateStage();
    this.render();
    showToast(`Fed ${type.toUpperCase()}! Stem grew to ${this.height.toFixed(1)}m`);
  },

  updateStage() {
    for (let i = 0; i < this.stageThresholds.length; i++) {
      if (this.height < this.stageThresholds[i].maxHeight || i === this.stageThresholds.length - 1) {
        this.stage = this.stageThresholds[i].stage;
        this.currentStageData = this.stageThresholds[i];
        break;
      }
    }
    // Preview only: no points are awarded here
    this.evoMultiplier = this.calcEvoPoints(this.height);
  },

  // The only place where points are actually awarded
  metaReset() {
    const earned = this.calcEvoPoints(this.height);
    this.evoPoints += earned;

    this.height = this.initialState.height;
    this.water = this.initialState.water;
    this.sun = this.initialState.sun;
    this.minerals = this.initialState.minerals;

    this.updateStage();
    this.render();
    showToast(`🌟 Roguelite Reset! +${earned} Evolution Points (total: ${this.evoPoints})`);
  },

  startDecayLoop() {
    setInterval(() => {
      this.water = Math.max(0, this.water - 0.7);
      this.sun = Math.max(0, this.sun - 0.9);
      this.minerals = Math.max(0, this.minerals - 0.5);

      if (this.water > 0 && this.sun > 0 && this.minerals > 0) {
        this.height += 1;
        this.updateStage();
      }
      this.render();
    }, 1500);
  },

  render() {
    const waterBar = document.getElementById('sim-water-bar');
    const sunBar = document.getElementById('sim-sun-bar');
    const mineralsBar = document.getElementById('sim-minerals-bar');

    const waterVal = document.getElementById('sim-water-val');
    const sunVal = document.getElementById('sim-sun-val');
    const mineralsVal = document.getElementById('sim-minerals-val');

    const flowerImg = document.getElementById('sim-flower-img');
    const heightDisp = document.getElementById('sim-height-display');
    const evoDisp = document.getElementById('sim-evo-display');
    const statusLog = document.getElementById('sim-status-log');

    if (waterBar) waterBar.style.width = `${this.water}%`;
    if (sunBar) sunBar.style.width = `${this.sun}%`;
    if (mineralsBar) mineralsBar.style.width = `${this.minerals}%`;

    if (waterVal) waterVal.textContent = `${Math.round(this.water)}%`;
    if (sunVal) sunVal.textContent = `${Math.round(this.sun)}%`;
    if (mineralsVal) mineralsVal.textContent = `${Math.round(this.minerals)}%`;

    if (heightDisp && this.currentStageData) {
      heightDisp.textContent = `Height: ${this.height.toFixed(1)}m (${this.currentStageData.label})`;
    }

    if (evoDisp) {
      evoDisp.textContent = `Evolution Points: ${this.evoPoints} (reset now: +${this.evoMultiplier})`;
    }

    if (flowerImg && this.currentStageData) {
      flowerImg.src = this.currentStageData.sprite;
    }

    if (statusLog) {
      if (this.water === 0 || this.sun === 0 || this.minerals === 0) {
        statusLog.textContent = '⚠️ Critical Alert: Resource depleted! Growth paused!';
        statusLog.style.color = '#f43f5e';
      } else {
        statusLog.textContent = `StageSpritesSwap: Swapping sprites at ScriptableObject thresholds (${this.stage}/9)...`;
        statusLog.style.color = 'var(--accent-cyan)';
      }
    }
  }
};

// --- 6. LIGHTBOX MODAL ---
function openLightbox(src, caption) {
  const modal = document.getElementById('lightbox-modal');
  const img = document.getElementById('lightbox-img');
  const cap = document.getElementById('lightbox-caption');

  if (modal && img) {
    img.src = src;
    if (cap) cap.textContent = caption || '';
    modal.classList.add('open');
  }
}

function closeLightboxDirect() {
  const modal = document.getElementById('lightbox-modal');
  if (modal) modal.classList.remove('open');
}

function closeLightbox(e) {
  if (e.target.id === 'lightbox-modal') {
    closeLightboxDirect();
  }
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeLightboxDirect();
  }
});

// --- 7. TOAST NOTIFICATION & COPY CONTACT ---
function showToast(message) {
  const toast = document.getElementById('toast-notice');
  const msg = document.getElementById('toast-message');
  if (!toast || !msg) return;

  msg.textContent = message;
  toast.classList.add('show');

  setTimeout(() => {
    toast.classList.remove('show');
  }, 2800);
}

function copyContact(text, successMsg) {
  navigator.clipboard.writeText(text).then(() => {
    showToast(successMsg || 'Copied to clipboard!');
  }).catch(() => {
    showToast('Failed to copy');
  });
}

// --- 8. COPY CODE BUTTON ---
function initCopyCode() {
  const btn = document.getElementById('copy-code-btn');
  const textElem = document.getElementById('copy-btn-text');

  if (!btn) return;

  btn.addEventListener('click', () => {
    const currentTab = document.querySelector('.code-tab-btn.active')?.getAttribute('data-tab') || 'spawn-service';
    const snippet = CODE_SNIPPETS[currentTab]?.code || '';

    navigator.clipboard.writeText(snippet).then(() => {
      if (textElem) textElem.textContent = 'Copied!';
      showToast('C# Code copied to clipboard!');
      setTimeout(() => {
        if (textElem) textElem.textContent = 'Copy Code';
      }, 2000);
    });
  });
}

// --- 9. INTERACTIVE AMBIENT BACKGROUND CANVAS ---
function initAmbientCanvas() {
  const canvas = document.getElementById('bg-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

  const particles = [];
  const PARTICLE_COUNT = Math.min(50, Math.floor(width / 26));

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    particles.push({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      radius: Math.random() * 1.5 + 0.8,
      alpha: Math.random() * 0.45 + 0.2
    });
  }

  let mouse = { x: -1000, y: -1000 };
  window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  });

  function draw() {
    ctx.clearRect(0, 0, width, height);

    for (let i = 0; i < particles.length; i++) {
      const p1 = particles[i];

      p1.x += p1.vx;
      p1.y += p1.vy;

      if (p1.x < 0) p1.x = width;
      if (p1.x > width) p1.x = 0;
      if (p1.y < 0) p1.y = height;
      if (p1.y > height) p1.y = 0;

      const dxMouse = mouse.x - p1.x;
      const dyMouse = mouse.y - p1.y;
      const distMouse = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse);
      if (distMouse < 120) {
        p1.x -= dxMouse * 0.015;
        p1.y -= dyMouse * 0.015;
      }

      ctx.beginPath();
      ctx.arc(p1.x, p1.y, p1.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0, 240, 255, ${p1.alpha * 0.6})`;
      ctx.fill();

      for (let j = i + 1; j < particles.length; j++) {
        const p2 = particles[j];
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 105) {
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.strokeStyle = `rgba(0, 240, 255, ${0.1 * (1 - dist / 105)})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }

    requestAnimationFrame(draw);
  }

  draw();
}

// --- 10. NAVIGATION & SCROLL SPY ---
function initNavigation() {
  const menuBtn = document.getElementById('mobile-menu-btn');
  const navLinks = document.getElementById('nav-links');

  if (menuBtn && navLinks) {
    menuBtn.addEventListener('click', () => {
      navLinks.classList.toggle('mobile-open');
    });

    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('mobile-open');
      });
    });
  }

  const sections = document.querySelectorAll('section[id]');
  window.addEventListener('scroll', () => {
    const scrollY = window.pageYOffset;

    sections.forEach(sec => {
      const secHeight = sec.offsetHeight;
      const secTop = sec.offsetTop - 120;
      const secId = sec.getAttribute('id');
      const navItem = document.querySelector(`.nav-link[href="#${secId}"]`);

      if (navItem) {
        if (scrollY > secTop && scrollY <= secTop + secHeight) {
          navItem.classList.add('active');
        } else {
          navItem.classList.remove('active');
        }
      }
    });
  });
}

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
  initProjectFilters();
  initMediaSwitchTabs();
  initCopyCode();
  initAmbientCanvas();
  initNavigation();
  SunflowerSim.init();

  // Load default code tab
  loadCodeSnippet('spawn-service');

  // Setup code tab buttons click
  document.querySelectorAll('.code-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.getAttribute('data-tab');
      loadCodeSnippet(tab);
    });
  });
});
