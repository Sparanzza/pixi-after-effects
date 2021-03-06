import * as PIXI from 'pixi.js';
import BezierEasing from 'bezier-easing';
import Element from './element';
import pixiVersionHelper from '../versionHelper';

export class ShapeElement extends Element {
  constructor(data, inFrame, outFrame, startTime) {
    super();
    if (!data) return;
    this.name   = data.nm;
    this.type   = data.ty;
    this.inFrame   = inFrame;
    this.outFrame  = outFrame;
    this.startTime = startTime;
    this.beginProcess = pixiVersionHelper.select(() => {} /* for v4 API */, () => { this.beginHole(); } /* for v5 API */);
    this.endProcess = pixiVersionHelper.select(() => { // for v4 API
      if (this.graphicsData.length <= 1) { return; }
      this.addHole();
    }, () => { // for v5 API
      this.endHole();
    });
    if (!data.it) {
      this.setupShapeByType(data);
    } else {
      this.setupShapeIteration(data.it);
    }
    this.drawThis(0);
  }

  setupShapeByType(data) {
    switch (data.ty) {
    case 'sh':
      this.setupPath(data);
      break;
    case 'st':
      this.setupStroke(data);
      break;
    case 'tm':
      this.setupTrim(data);
      break;
    case 'rc':
      this.setupRect(data);
      break;
    case 'el':
      this.setupEllipse(data);
      break;
    case 'fl':
      this.setupFill(data);
      break;
    case 'tr':
      this.setupProperties(data);
      break;
    default:
      break;
    }
  }

  setupShapeIteration(data) {
    data.forEach((def) => {
      this.setupShapeByType(def);
    });
    if (this.shapePaths) this.shapePaths.reverse();
  }

  setupPath(data) {
    if (!this.shapePaths) this.shapePaths = [];
    const shapePath = {};
    shapePath.isClosed = data.closed;
    shapePath.name     = data.nm;
    shapePath.path     = this.createPath(data.ks.k);
    this.shapePaths.push(shapePath);
  }

  setupStroke(data) {
    const stroke  = {};
    stroke.lineCap     = data.lc;
    stroke.lineJoin    = data.lj;
    stroke.miterLimit  = data.ml;
    stroke.opacity     = data.o.k;
    stroke.width       = data.w.k;
    stroke.color       = ShapeElement.createColor(data.c);
    stroke.enabledFill = data.fillEnabled;
    this.stroke        = stroke;
  }

  setupTrim(data) {
    const trim = {};
    trim.m     = data.m;
    trim.o     = data.o;
    trim.name  = data.nm;
    trim.start = ShapeElement.createTrim(data.s.k);
    trim.end   = ShapeElement.createTrim(data.e.k);
    if (trim.start.length > 0) {
      trim.enabledAnimation = true;
    }
    this.trim  = trim;
  }

  static createTrim(data) {
    if (typeof data === 'number') {
      return data;
    }
    return ShapeElement.createTrimAnimation(data);
  }

  static createTrimEasing(animData) {
    if (animData.i && animData.o) {
      return BezierEasing(animData.o.x[0], animData.o.y[0], animData.i.x[0], animData.i.y[0]);
    }
    return x => x;
  }

  static createTrimAnimation(data) {
    const lastIndex = data.length - 1;
    return data.map((animData, index) => {
      return {
        name:       animData.n,
        startFrame: animData.t,
        endFrame:   (lastIndex > index) ? data[index + 1].t : animData.t,
        easing:     ShapeElement.createTrimEasing(animData),
        fromRatio:  animData.s ? animData.s[0] : null,
        toRatio:    animData.e ? animData.e[0] : null,
      };
    });
  }

  setupRect(data) {
    if (!this.rects) this.rects = [];
    const rect = {};
    rect.name      = data.nm;
    rect.direction = data.d;
    rect.position  = ShapeElement.createPosition(data.p);
    rect.size      = ShapeElement.createSize(data.s);
    if (rect.position.length > 0 || rect.size.length > 0) {
      rect.enabledAnimation = true;
    }
    this.rects.push(rect);
  }

  setupEllipse(data) {
    if (!this.ellipses) this.ellipses = [];
    const ellipse = {};
    ellipse.direction = data.d;
    ellipse.position  = ShapeElement.createPosition(data.p);
    ellipse.size      = ShapeElement.createSize(data.s);
    if (ellipse.position.length > 0 || ellipse.size.length > 0) {
      ellipse.enabledAnimation = true;
    }
    this.ellipses.push(ellipse);
  }

  static createSize(data) {
    return ShapeElement.createPosition(data);
  }

  static createColor(data) {
    if (typeof data.k[0] === 'number') {
      return ShapeElement.rgbArrayToHex(data.k);
    }
    return ShapeElement.createAnimatedColor(data.k);
  }

  static createColorEasing(animData) {
    if (animData.i && animData.o) {
      return BezierEasing(animData.o.x, animData.o.y, animData.i.x, animData.i.y);
    }
    return x => x;
  }

  static createAnimatedColor(data) {
    const lastIndex = data.length - 1;
    return data.map((animData, index) => {
      return {
        name:       animData.n,
        startFrame: animData.t,
        endFrame:   (lastIndex > index) ? data[index + 1].t : animData.t,
        easing:     ShapeElement.createColorEasing(animData),
        fromColor:  animData.s ? ShapeElement.rgbArrayToHex(animData.s) : '0x000000',
        toColor:    animData.e ? ShapeElement.rgbArrayToHex(animData.e) : '0x000000',
      };
    });
  }

  static createPathEasing(animData) {
    if (animData.i && animData.o) {
      return BezierEasing(animData.o.x, animData.o.y, animData.i.x, animData.i.y);
    }
    return x => x;
  }

  createPathByAnimation(data) {
    const lastIndex = data.length - 1;
    return {
      hasAnimatedPath: true,
      paths: data.map((animData, index) => {
        return {
          name:       animData.n,
          startFrame: animData.t,
          endFrame:   (lastIndex > index) ? data[index + 1].t : animData.t,
          easing:     ShapeElement.createPathEasing(animData),
          fromPath:   animData.s ? this.createPath(animData.s[0]) : null,
          toPath:     animData.e ? this.createPath(animData.e[0]) : null,
        };
      }),
    };
  }

  createPath(data) {
    if (!data.v) return this.createPathByAnimation(data);

    // TODO: more smartly clone data
    data = JSON.parse(JSON.stringify(data));

    const path = {};
    data.v.forEach((_v, index) => {
      data.i[index][0] += data.v[index][0];
      data.i[index][1] += data.v[index][1];
      data.o[index][0] += data.v[index][0];
      data.o[index][1] += data.v[index][1];
      if (index === 0) return;
      const cp  = data.o[index - 1];
      const cp2 = data.i[index];
      const to  = data.v[index];
      if (index === 1) {
        path.moveTo = new PIXI.Point(data.v[0][0], data.v[0][1]);
      }
      if (!path.bezierCurveToPaths) path.bezierCurveToPaths = [];
      path.bezierCurveToPaths.push({
        cp:  new PIXI.Point(cp[0], cp[1]),
        cp2: new PIXI.Point(cp2[0], cp2[1]),
        to:  new PIXI.Point(to[0], to[1]),
      });
    });
    path.bezierCurveToPaths.push({
      cp:  new PIXI.Point(data.o[data.v.length - 1][0], data.o[data.v.length - 1][1]),
      cp2: new PIXI.Point(data.i[0][0], data.i[0][1]),
      to:  new PIXI.Point(data.v[0][0], data.v[0][1]),
    });
    return path;
  }

  setupFill(data) {
    const fill     = {};
    fill.color   = ShapeElement.createColor(data.c);
    fill.enabled = true;
    fill.name    = data.nm;
    fill.opacity = ShapeElement.createOpacity(data.o);
    this.fillRGBA    = fill;
  }

  static rgbArrayToHex(arr) {
    return ShapeElement.rgbToHex(arr[0], arr[1], arr[2]);
  }

  static rgbToHex(r, g, b) {
    const toHex = ShapeElement.toHex;
    return `0x${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  static toHex(c) {
    if (c <= 1) {
      c *= 255;
      c  = Math.floor(c);
    }
    const hex = c.toString(16);
    return hex.length === 1 ? `0${hex}` : hex;
  }

  updateAnimationFrameByBaseFrame(animBaseFrame) {
    super.updateAnimationFrameByBaseFrame(animBaseFrame);
    if (!this.shapePaths) return;
    this.shapePaths.forEach((shapePath) => {
      if (!shapePath.path.hasAnimatedPath) return;
      shapePath.path.paths.forEach((animData) => {
        animData.startFrame += animBaseFrame;
        animData.endFrame   += animBaseFrame;
      });
    });
    if (this.ellipses) {
      this.ellipses.forEach((ellipse) => {
        if (!ellipse.enabledAnimation) return;

        if (ellipse.size.length > 0) {
          ellipse.size.forEach((animData) => {
            animData.startFrame += animBaseFrame;
            animData.endFrame   += animBaseFrame;
          });
        }
        if (ellipse.position.length > 0) {
          ellipse.position.forEach((animData) => {
            animData.startFrame += animBaseFrame;
            animData.endFrame   += animBaseFrame;
          });
        }
      });
    }
    if (this.rects) {
      this.rects.forEach((rect) => {
        if (!rect.enabledAnimation) return;

        if (rect.size.length > 0) {
          rect.size.forEach((animData) => {
            animData.startFrame += animBaseFrame;
            animData.endFrame   += animBaseFrame;
          });
        }
        if (rect.position.length > 0) {
          rect.position.forEach((animData) => {
            animData.startFrame += animBaseFrame;
            animData.endFrame   += animBaseFrame;
          });
        }
      });
    }
  }

  drawPathForMask(shapePath) {
    const moveTo = shapePath.moveTo;
    this.moveTo(moveTo.x, moveTo.y);
    shapePath.bezierCurveToPaths.forEach((path) => {
      this.bezierCurveTo(path.cp.x, path.cp.y, path.cp2.x, path.cp2.y, path.to.x, path.to.y);
    });
    this.closePath();
  }

  beforeDraw() {
    if (this.stroke) {
      if (this.stroke.enabledFill) {
        this.beginFill(this.strokeColorHex);
      } else if (this.fillRGBA) {
        this.beginFill(this.fillColorHex);
      }
      this.lineStyle(this.stroke.width, this.strokeColorHex);
      // TODO: ignore miterLimit and lineCap and lineJoin
    } else if (this.fillRGBA) {
      if (this.fillRGBA.enabled) {
        this.beginFill(this.fillColorHex);
      } else {
        this.lineStyle(2, this.fillColorHex);
      }
    }
  }

  afterDraw() {
    if (!this.isClosed) return;

    if (this.stroke) {
      if (this.stroke.enabledFill) {
        this.endFill();
      } else if (this.fillRGBA) {
        this.endFill();
      } else {
        this.closePath();
      }
    } else if (this.fillRGBA) {
      if (this.fillRGBA.enabled) {
        this.endFill();
      } else {
        this.closePath();
      }
    }
  }

  drawPath(shapePath) {
    this.beforeDraw();

    this.moveTo(shapePath.moveTo.x, shapePath.moveTo.y);
    shapePath.bezierCurveToPaths.forEach((path) => {
      this.bezierCurveTo(path.cp.x, path.cp.y, path.cp2.x, path.cp2.y, path.to.x, path.to.y);
    });

    this.afterDraw();
  }

  static createAnimatePos(animData, frame, fromPos, toPos) {
    const totalFrame = animData.endFrame - animData.startFrame;
    const playFrame  = (frame - animData.startFrame) * 1.0;
    const posDiffX   = toPos.x - fromPos.x;
    const posDiffY   = toPos.y - fromPos.y;
    const playRatio  = playFrame / totalFrame;
    const posRatio   = animData.easing(playRatio);
    const posX       = posDiffX * posRatio + fromPos.x;
    const posY       = posDiffY * posRatio + fromPos.y;
    return new PIXI.Point(posX, posY);
  }

  static createAnimatePath(animData, frame) {
    const fromPath   = animData.fromPath;
    const toPath     = animData.toPath;
    return {
      moveTo: ShapeElement.createAnimatePos(animData, frame, fromPath.moveTo, toPath.moveTo),
      bezierCurveToPaths: fromPath.bezierCurveToPaths.map((path, index) => {
        const fromBezierCurveToPath = fromPath.bezierCurveToPaths[index];
        const toBezierCurveToPath   = toPath.bezierCurveToPaths[index];
        const cp  = ShapeElement.createAnimatePos(animData, frame, fromBezierCurveToPath.cp, toBezierCurveToPath.cp);
        const cp2 = ShapeElement.createAnimatePos(animData, frame, fromBezierCurveToPath.cp2, toBezierCurveToPath.cp2);
        const to  = ShapeElement.createAnimatePos(animData, frame, fromBezierCurveToPath.to, toBezierCurveToPath.to);
        return { cp, cp2, to };
      }),
    };
  }

  setupStrokeColor(frame) {
    if (!this.stroke) return;

    if (typeof this.stroke.color !== 'string') {
      const firstColor = this.stroke.color[0];
      if (frame < firstColor.startFrame) {
        this.strokeColorHex = firstColor.fromColor;
        return;
      }
      this.stroke.color.forEach((animData) => {
        if (animData.startFrame <= frame  && frame <= animData.endFrame) {
          this.strokeColorHex = animData.fromColor;
        }
      });
      const lastColor = this.stroke.color[this.stroke.color.length - 2];
      if (frame > lastColor.endFrame) {
        this.strokeColorHex = lastColor.fromColor;
      }
    } else {
      this.strokeColorHex = this.stroke.color;
    }
  }

  setupFillColor(frame) {
    if (!this.fillRGBA) return;

    if (typeof this.fillRGBA.color !== 'string') {
      const firstColor = this.fillRGBA.color[0];
      if (frame < firstColor.startFrame) {
        this.fillColorHex = firstColor.fromColor;
        return;
      }
      this.fillRGBA.color.forEach((animData) => {
        if (animData.startFrame <= frame  && frame <= animData.endFrame) {
          this.fillColorHex = animData.fromColor;
        }
      });
      const lastColor = this.fillRGBA.color[this.fillRGBA.color.length - 2];
      if (frame > lastColor.endFrame) {
        this.fillColorHex = lastColor.toColor;
      }
    } else {
      this.fillColorHex = this.fillRGBA.color;
    }
  }

  static createShapePosition(frame, shape) {
    if (shape.position.length > 0) {
      let pos = null;
      shape.position.forEach((animData) => {
        if (animData.startFrame <= frame  && frame <= animData.endFrame) {
          const posDiffX     = animData.toPosition[0] - animData.fromPosition[0];
          const posDiffY     = animData.toPosition[1] - animData.fromPosition[1];
          const totalFrame   = animData.endFrame - animData.startFrame;
          const playFrame    = (frame - animData.startFrame) * 1.0;
          const playRatio    = playFrame / totalFrame;
          const posRatio     = animData.easing(playRatio);
          const posX         = posDiffX * posRatio + animData.fromPosition[0];
          const posY         = posDiffY * posRatio + animData.fromPosition[1];
          pos = new PIXI.Point(posX, posY);
        }
      });
      const lastPos = shape.position[shape.position.length - 2];
      if (frame > lastPos.endFrame) {
        pos = lastPos.toPos;
      }
      return pos;
    }
    return shape.position;
  }

  static createShapeSize(frame, shape) {
    if (shape.size.length > 0) {
      let size = null;
      shape.size.forEach((animData) => {
        if (animData.startFrame <= frame  && frame <= animData.endFrame) {
          const sizeDiffW  = animData.toPosition[0] - animData.fromPosition[0];
          const sizeDiffH  = animData.toPosition[1] - animData.fromPosition[1];
          const totalFrame = animData.endFrame - animData.startFrame;
          const playFrame  = (frame - animData.startFrame) * 1.0;
          const playRatio  = playFrame / totalFrame;
          const sizeRatio  = animData.easing(playRatio);
          const sizeWidth  = sizeDiffW * sizeRatio + animData.fromPosition[0];
          const sizeHeight = sizeDiffH * sizeRatio + animData.fromPosition[1];
          size = new PIXI.Point(sizeWidth, sizeHeight);
        }
      });
      const lastSize = shape.size[shape.size.length - 2];
      if (frame > lastSize.endFrame) {
        size = lastSize.toPos;
      }
      return size;
    }
    return shape.size;
  }

  drawEllipseAnimation(frame, ellipse) {
    const pos  = ShapeElement.createShapePosition(frame, ellipse);
    const size = ShapeElement.createShapeSize(frame, ellipse);
    if (!pos || !size) return;

    this.drawEllipse(pos.x, pos.y, size.x / 2.0, size.y / 2.0);
  }

  drawRectAnimation(frame, rect) {
    const pos  = ShapeElement.createShapePosition(frame, rect);
    const size = ShapeElement.createShapeSize(frame, rect);
    if (!pos || !size) return;

    this.drawRect(pos.x, pos.y, size.x, size.y);
  }

  drawTrim(frame) {
    if (!this.trim.enabledAnimation) {
      this.beforeDraw();
      this.shapePaths.forEach((shapePath) => {
        const path = shapePath.path;

        const fromPath = path.moveTo;
        const toPath   = path.bezierCurveToPaths[0];
        const xDiff    = toPath.to.x - fromPath.x;
        const yDiff    = toPath.to.y - fromPath.y;

        const startX = fromPath.x + xDiff * this.trim.start / 100;
        const startY = fromPath.y + yDiff * this.trim.start / 100;
        const endX   = fromPath.x + xDiff * this.trim.end / 100;
        const endY   = fromPath.y + yDiff * this.trim.end / 100;
        this.moveTo(startX, startY);
        this.lineTo(endX, endY);
      });
      this.afterDraw();
      return;
    }

    if (frame < this.trim.start[0].startFrame && frame < this.trim.end[0].startFrame) return;

    let trimStartRatio = 0;
    this.trim.start.some((animData) => {
      if (animData.startFrame === animData.endFrame) {
        return false;
      }
      if (animData.startFrame <= frame && frame <= animData.endFrame) {
        const ratioDiff  = animData.toRatio - animData.fromRatio;
        const totalFrame = animData.endFrame - animData.startFrame;
        const playFrame  = frame - animData.startFrame;
        const perFrameRatio  = 1.0 * ratioDiff / totalFrame;
        trimStartRatio = playFrame * perFrameRatio + animData.fromRatio;
        return true;
      }
      return false;
    });
    let last = this.trim.start[this.trim.start.length - 2];
    if (last.endFrame <= frame) {
      trimStartRatio = last.toRatio;
    }

    let trimEndRatio = 0;
    this.trim.end.some((animData) => {
      if (animData.startFrame === animData.endFrame) {
        return false;
      }
      if (animData.startFrame <= frame && frame <= animData.endFrame) {
        if (!animData.fromRatio) return false;
        const ratioDiff  = animData.toRatio - animData.fromRatio;
        const totalFrame = animData.endFrame - animData.startFrame;
        const playFrame  = frame - animData.startFrame;
        const perFrameRatio  = 1.0 * ratioDiff / totalFrame;
        trimEndRatio = playFrame * perFrameRatio + animData.fromRatio;
        return true;
      }
      return false;
    });
    last = this.trim.end[this.trim.end.length - 2];
    if (last.endFrame <= frame) {
      trimEndRatio = last.toRatio;
    }

    if (trimStartRatio > trimEndRatio) {
      const tmp      = trimStartRatio;
      trimStartRatio = trimEndRatio;
      trimEndRatio   = tmp;
    }
    this.beforeDraw();
    this.shapePaths.forEach((shapePath) => {
      const path = shapePath.path;

      const fromPath = path.moveTo;
      const toPath   = path.bezierCurveToPaths[0];
      const xDiff    = toPath.to.x - fromPath.x;
      const yDiff    = toPath.to.y - fromPath.y;

      const startX = fromPath.x + xDiff * trimStartRatio / 100;
      const startY = fromPath.y + yDiff * trimStartRatio / 100;
      const endX   = fromPath.x + xDiff * trimEndRatio / 100;
      const endY   = fromPath.y + yDiff * trimEndRatio / 100;
      this.moveTo(startX, startY);
      this.lineTo(endX, endY);
    });
    this.afterDraw();
  }

  drawShapePath(frame, shapePath, index) {
    if (shapePath.path.hasAnimatedPath) {
      this.isClosed = shapePath.isClosed;
      const paths = shapePath.path.paths;
      if (frame < paths[0].startFrame) {
        if (index !== 0) { this.beginProcess(); }
        this.drawPath(paths[0].fromPath);
        if (index !== 0) { this.endProcess(); }
      }
      shapePath.path.paths.some((animData) => {
        if (animData.startFrame === animData.endFrame) {
          return false;
        }
        if (animData.startFrame <= frame && frame <= animData.endFrame) {
          if (!animData.fromPath) return false;
          if (index !== 0) { this.beginProcess(); }
          const animatePath = ShapeElement.createAnimatePath(animData, frame);
          this.drawPath(animatePath);
          if (index !== 0) { this.endProcess(); }
          return true;
        }
        return false;
      });
      const lastPath = paths[paths.length - 2];
      if (lastPath.endFrame <= frame) {
        if (index !== 0) { this.beginProcess(); }
        this.drawPath(lastPath.toPath);
        if (index !== 0) { this.endProcess(); }
      }
    } else if (this.inFrame <= frame && frame <= this.outFrame) {
      if (index !== 0) { this.beginProcess(); }
      this.isClosed = shapePath.isClosed;
      this.drawPath(shapePath.path);
      if (index !== 0) { this.endProcess(); }
    }
  }

  drawShapePaths(frame) {
    this.shapePaths.forEach((shapePath, index) => {
      this.drawShapePath(frame, shapePath, index);
    });
  }

  drawThis(frame) {
    this.clear();

    this.setupStrokeColor(frame);
    this.setupFillColor(frame);

    if (this.trim) {
      this.drawTrim(frame);
    } else if (this.shapePaths) {
      this.drawShapePaths(frame);
    }

    if (this.ellipses) {
      this.beforeDraw();
      this.ellipses.forEach((ellipse) => {
        if (ellipse.enabledAnimation) {
          this.drawEllipseAnimation(frame, ellipse);
        } else {
          this.drawEllipse(ellipse.position.x, ellipse.position.y, ellipse.size.x / 2.0, ellipse.size.y / 2.0);
        }
      });
      this.afterDraw();
    }
    if (this.rects) {
      this.beforeDraw();
      this.rects.forEach((rect) => {
        if (rect.enabledAnimation) {
          this.drawRectAnimation(frame, rect);
        } else {
          this.drawRect(rect.position.x, rect.position.y, rect.size.x, rect.size.y);
        }
      });
      this.afterDraw();
    }
  }

  __updateWithFrame(frame) {
    super.__updateWithFrame(frame);
    this.drawThis(frame);
  }
}

export default class ShapeContainerElement extends Element {
  constructor(data) {
    super(data);
    if (data.bounds) {
      this.setupBounds(data.bounds);
    } else {
      this.width  = 0;
      this.height = 0;
    }
    this.shapes = data.shapes.map((shape) => {
      return new ShapeElement(shape, this.inFrame, this.outFrame, this.startTime);
    });
    this.shapes.forEach((shape) => {
      if (this.scaleX && this.scaleY) {
        shape.scaleX = this.scaleX;
        shape.scaleY = this.scaleY;
        shape.scale = new PIXI.Point(this.scaleX, this.scaleY);
      }
      this.addChild(shape);
    });
  }

  destroy(opt) {
    const children = this.children.concat();
    children.forEach((child) => {
      child.destroy(opt);
      this.removeChild(child);
    });
  }

  set frameRate(value) {
    super.frameRate = value;
    this.children.forEach((child) => {
      child.frameRate = value;
    });
  }

  set opt(value) {
    super.opt = value;
    this.children.forEach((child) => {
      child.opt = value;
    });
  }

  updateAnimationFrameByBaseFrame(animBaseFrame) {
    super.updateAnimationFrameByBaseFrame(animBaseFrame);
    this.shapes.forEach((shape) => {
      shape.inFrame  += animBaseFrame;
      shape.outFrame += animBaseFrame;
      shape.updateAnimationFrameByBaseFrame(animBaseFrame);
    });
  }

  setupBounds(data) {
    const bounds = {};
    bounds.top    = data.t;
    bounds.bottom = data.b;
    bounds.left   = data.l;
    bounds.right  = data.r;
    this.width    = data.r - data.l;
    this.height   = data.b - data.t;
    this.bounds   = bounds;
  }

  __updateWithFrame(frame) {
    super.__updateWithFrame(frame);
    if (this.noreplay) {
      const children = this.children.concat();
      children.forEach((layer) => {
        if (layer.outFrame < frame) {
          this.removeChild(layer);
          layer.destroy();
          return false;
        }

        layer.__updateWithFrame(frame);
        return true;
      });
    } else {
      this.children.forEach((layer) => {
        layer.__updateWithFrame(frame);
      });
    }
  }
}
