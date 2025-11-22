## How Does A Mixin Work in TypeScript?

A **mixin** is a pattern for building up classes from reusable components by combining simpler partial classes, as an alternative to traditional inheritance hierarchies.

### Core Concept

The pattern relies on **generics with class inheritance** to extend a base class. TypeScript's best mixin support uses the **class expression pattern**.

### Basic Implementation

**1. Start with a base class:**
```ts
class Sprite {
  name = "";
  x = 0;
  y = 0;
  constructor(name: string) {
    this.name = name;
  }
}
```

**2. Define a constructor type and a factory function:**
```ts
// Type declaring the input is a class
type Constructor = new (...args: any[]) => {};

// Mixin factory function - returns a class expression extending the base
function Scale<TBase extends Constructor>(Base: TBase) {
  return class Scaling extends Base {
    _scale = 1;

    setScale(scale: number) {
      this._scale = scale;
    }

    get scale(): number {
      return this._scale;
    }
  };
}
```

**3. Compose the new class:**
```ts
const EightBitSprite = Scale(Sprite);
const flappySprite = new EightBitSprite("Bird");
flappySprite.setScale(0.8);
console.log(flappySprite.scale); // 0.8
```

### Constrained Mixins

For mixins that need knowledge of the base class, use a generic constructor type:

```ts
type GConstructor<T = {}> = new (...args: any[]) => T;
type Positionable = GConstructor<{ setPos: (x: number, y: number) => void }>;

function Jumpable<TBase extends Positionable>(Base: TBase) {
  return class Jumpable extends Base {
    jump() {
      this.setPos(0, 20); // Only works because Positionable guarantees setPos exists
    }
  };
}
```

### Key Constraints

1. **Mixins cannot declare private/protected properties** - use ES2020 private fields (`#field`) instead
2. **Decorators cannot provide mixins** via code flow analysis (TypeScript limitation)
3. **Static property mixins** create singletons - use functions returning classes with generics as a workaround
