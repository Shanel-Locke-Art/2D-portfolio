import { dialogueData, scaleFactor } from "./constants";
import { k } from "./kaboomCtx";
import { displayDialogue, setCamScale } from "./utils";

// Load assets
k.loadSprite("spritesheet", "./spritesheet.png", {
  sliceX: 39,
  sliceY: 31,
  anims: {
    "idle-down": 952,
    "walk-down": { from: 952, to: 955, loop: true, speed: 8 },
    "idle-side": 991,
    "walk-side": { from: 991, to: 994, loop: true, speed: 8 },
    "idle-up": 1030,
    "walk-up": { from: 1030, to: 1033, loop: true, speed: 8 },
  },
});

k.loadSprite("map", "./map.png");

k.setBackground(k.Color.fromHex("#311047"));

k.loadSound("music", "./music.mp3");
k.loadSound("soundUI", "./pickupCoin.wav");

k.scene("main", async () => {
  // 🔁 Start looping background music
  const music = k.play("music", {
    loop: true,
    volume: 0.5,
  });

  const mapData = await (await fetch("./map.json")).json();
  const layers = mapData.layers;

  const map = k.add([k.sprite("map"), k.pos(0), k.scale(scaleFactor)]);

  const player = k.make([
    k.sprite("spritesheet", { anim: "idle-down" }),
    k.area({
      shape: new k.Rect(k.vec2(0, 3), 10, 10),
    }),
    k.body(),
    k.anchor("center"),
    k.pos(),
    k.scale(scaleFactor),
    {
      speed: 250,
      direction: "down",
      isInDialogue: false,
    },
    "player",
  ]);

  for (const layer of layers) {
    if (layer.name === "boundaries") {
      for (const boundary of layer.objects) {
        map.add([
          k.area({
            shape: new k.Rect(k.vec2(0), boundary.width, boundary.height),
          }),
          k.body({ isStatic: true }),
          k.pos(boundary.x, boundary.y),
          boundary.name,
        ]);
    
        // 👇 Skip generic "boundary" or anything not meant for dialogue
        if (
          boundary.name &&
          boundary.name !== "boundary" &&
          boundary.name !== "wall"
        ) {
          player.onCollide(boundary.name, () => {
            if (!player.isInDialogue) {
              k.play("soundUI", { volume: 1.0 });
              player.isInDialogue = true;
              displayDialogue(dialogueData[boundary.name], () => {
                player.isInDialogue = false;
              });
            }
          });
        }
      }
      continue;
    }

    if (layer.name === "spawnpoint") {
      for (const entity of layer.objects) {
        if (entity.name === "player") {
          player.pos = k.vec2(
            (map.pos.x + entity.x) * scaleFactor,
            (map.pos.y + entity.y) * scaleFactor
          );
          k.add(player);
        }
      }
    }
  }

  setCamScale(k);

  k.onResize(() => {
    setCamScale(k);
  });

  k.onUpdate(() => {
    k.camPos(player.worldPos().x, player.worldPos().y - 100);
  });

  k.onMouseDown((mouseBtn) => {
    if (mouseBtn !== "left" || player.isInDialogue) return;

    const worldMousePos = k.toWorld(k.mousePos());
    player.moveTo(worldMousePos, player.speed);

    const mouseAngle = player.pos.angle(worldMousePos);

    const lowerBound = 50;
    const upperBound = 125;

    if (
      mouseAngle > lowerBound &&
      mouseAngle < upperBound &&
      player.curAnim() !== "walk-up"
    ) {
      player.play("walk-up");
      player.direction = "up";
      return;
    }

    if (
      mouseAngle < -lowerBound &&
      mouseAngle > -upperBound &&
      player.curAnim() !== "walk-down"
    ) {
      player.play("walk-down");
      player.direction = "down";
      return;
    }

    if (Math.abs(mouseAngle) > upperBound) {
      player.flipX = false;
      if (player.curAnim() !== "walk-side") player.play("walk-side");
      player.direction = "right";
      return;
    }

    if (Math.abs(mouseAngle) < lowerBound) {
      player.flipX = true;
      if (player.curAnim() !== "walk-side") player.play("walk-side");
      player.direction = "left";
      return;
    }
  });

  function stopAnims() {
    if (player.direction === "down") {
      player.play("idle-down");
      return;
    }
    if (player.direction === "up") {
      player.play("idle-up");
      return;
    }

    player.play("idle-side");
  }

  k.onMouseRelease(stopAnims);
  k.onKeyRelease(stopAnims);

  k.onKeyDown(() => {
    const right = k.isKeyDown("right");
    const left = k.isKeyDown("left");
    const up = k.isKeyDown("up");
    const down = k.isKeyDown("down");

    const directions = [right, left, up, down].filter(Boolean);
    if (directions.length > 1 || player.isInDialogue) return;

    if (right) {
      player.flipX = false;
      player.play("walk-side");
      player.direction = "right";
      player.move(player.speed, 0);
    } else if (left) {
      player.flipX = true;
      player.play("walk-side");
      player.direction = "left";
      player.move(-player.speed, 0);
    } else if (up) {
      player.play("walk-up");
      player.direction = "up";
      player.move(0, -player.speed);
    } else if (down) {
      player.play("walk-down");
      player.direction = "down";
      player.move(0, player.speed);
    }
  });
});

k.go("main");

