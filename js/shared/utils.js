// Shared utility functions
import("ramda").catch((e) => {}); // https://ramdajs.com



/**
 *
 * @returns {Array<AvalancheDataRaw>}
 */
export async function loadData() {
  console.log("Loading Data");
  const avalanches = await d3.csv("data/avalanches.csv");
  // const map = await d3.json("data/map.geojson");
  avalanches.forEach((d, i) => {
    d["aid"] = i;
  });
  return avalanches;
}

/**
 *
 * @param {d3.Selection} selection
 * @returns {DOMRect}
 */
export function getDimensions(selection) {
  return selection.node().getBoundingClientRect();
}

export function range(x, y) {
  // stolen from: https://stackoverflow.com/questions/3895478/does-javascript-have-a-method-like-range-to-generate-a-range-within-the-supp
  if (x > y) {
    return [];
  } else return [x, ...range(x + 1, y)];
}

/**
 *
 * @param {string} color : any color representation that can be parsed by d3.color
 * @param {Callable<number[], number[]>} rgbShift
 * @returns
 */
export function shiftColor(color, rgbShift) {
  let d3Color = d3.color(color);
  if (d3Color == null) d3Color = { r: 0, g: 0, b: 0 };

  let rgb = [d3Color.r, d3Color.g, d3Color.b];
  let rgbNew = rgbShift(rgb).map((e) => clamp(e, 1, 255));

  let hexNew = "#" + rgbNew.map((e) => e.toString(16).padStart(2, 0)).join("");

  // console.log({
  //   hex_old: color,
  //   rgb_old: rgb,
  //   shift: rgbShift,
  //   rgb_new: rgbNew,
  //   hex_new: hexNew,
  // });
  return hexNew;
}

/**
 *
 * @param {object[]} arr
 * @param {number} n : number of times to roll
 * @returns {object[]} : array rolled forward n times
 */
export function roll(arr, n) {
  let N = arr.length;
  while (n > 0) {
    arr = arr.map((e, i, a) => {
      return a[(((i + 1) % N) + N) % N];
    });
    n--;
  }
  return arr;
}

/**
 *
 * @param {number} l
 * @param {number} u
 * @returns {number}
 */
export function randClamp(l, u) {
  return clamp(randGen(), l, u);
}
/**
 *
 * @param {number} l
 * @param {number} u
 * @returns {number}
 */
export function clamp(x, l, u) {
  return Math.max(Math.min(x, u), l);
}

/**
 *
 * @param {string} s
 * @param {string} delim
 * @param {number} maxsplit
 * @returns
 */
export function split(s, delim, maxsplit) {
  let ss = s.split(delim);
  return [...ss.slice(0, maxsplit), ss.slice(maxsplit).join(delim)].filter(
    (e) => e.length
  );
}

/**
 *
 * @param {string} s
 * @param {string} delim
 * @param {number} maxsplit
 * @returns
 */
export function rsplit(s, delim, maxsplit) {
  return split(rev(s), delim, maxsplit)
    .map((e) => rev(e))
    .reverse();
}

/**
 *
 * @param {string|object[]} t
 * @returns
 */
export function rev(t) {
  return Array.from(t).reverse().join("");
}

/**
 *
 * @param {object[]} pool
 * @param {number[]} choices
 * @returns
 */
export function choose(pool, choices) {
  let a = Array(choices.length);
  choices.forEach((i, j) => {
    a[j] = pool[i];
  });
  return a;
}

/** This function wraps text in a d3 selection
 *  Usage: `<text_selection>.call(wrapText, <parent_selection>);
 * @param {d3.Selection} textSelection
 * @param {d3.Selection} parentSelection
 */
export function wrapText(textSelection, parentSelection) {
  // Compute the width of the text element
  let textWidth = textSelection.node().getComputedTextLength();

  // Compute the width of the parent element
  let parentWidth = parentSelection.node().getBoundingClientRect().width;

  // Select the text element and append a tspan element for each line of text
  // textSelection
  //   .selectAll("tspan")
  //   .data(textSelection.text().trim().split("\n"))
  //   .enter()
  //   .append("tspan")
  //   // .attr("x", parseFloat(parentSelection.attr("x")) + parseFloat(parentSelection.attr('width') / 2))
  //   .attr("x", parentSelection.attr("x"))
  //   // .attr("y", parentSelection.attr("y"))
  //   .attr("dy", "1.2em")
  //   .text(d=>d);

  // If the text is wider than the parent element, set the text to wrap
  if (textWidth > parentWidth) {
    textSelection.call(wrap, parentWidth);
  }
}
/**
 *
 * @param {d3.Selection} text
 * @param {number} width
 */
export function wrap(text, width) {
  text.each(function () {
    let text = d3.select(this);
    text.selectAll("tspan").remove();

    let words = text
      .text()
      .split(/[^\S\n]+/)
      .reverse();
    let word;
    let line = [];
    let lineNumber = 0;
    let lineHeight = 1.2;
    let x = text.attr("x");
    let y = text.attr("y");
    let dy = 0;
    let tspan = text
      .text(null)
      .append("tspan")
      .attr("x", x)
      .attr("y", y)
      .attr("dy", dy + "em");

    while ((word = words.pop())) {
      line.push(word);
      tspan.text(line.join(" "));
      if (tspan.node().getComputedTextLength() > width) {
        line.pop();
        tspan.text(line.join(" "));
        line = [word];
        tspan = text
          .append("tspan")
          .attr("x", x)
          .attr("y", y)
          .attr("dy", ++lineNumber * lineHeight + dy + "em")
          .text(word);
      }
    }
  });
}

/**
 *
 * @param {Array<AvalancheDataRaw>} data_raw
 * @returns {Array<AvalancheData>}
 */
export function preprocessData(data_raw) {
  // TODO: preprocess dataset to standard form

  let data = data_raw.map((d, i) => {
    let coordinates = [0, 0];

    if (d.Coordinates.length > 0)
      coordinates = d.Coordinates.split(", ")
        .map((c) => parseFloat(c))
        .reverse();

    d.Date = new Date(d.Date) != "Invalid Date" ? new Date(d.Date) : null;
    const parseFeetFromString = (x) =>
    parseFloat(
      x.slice(0, x.length - 1).replace(",", "") / (x.endsWith('"') ? 12 : 1)
    );
    return {
      aid: i,
      date: d["Date"],
      region: d["Region"],
      place: d["Place"],
      trigger: d["Trigger"],
      trigger_info: d["Trigger: additional info"],
      layer: d["Weak Layer"],
      depth: parseFeetFromString(d["Depth"]),
      width: parseFeetFromString(d["Width"]),
      vertical: parseFeetFromString(d["Vertical"]),
      aspect: d["Aspect"],
      elevation: parseFeetFromString(d["Elevation"]),
      coordinates: coordinates,
      victim_status: {
        caught: d["Caught"],
        carried: d["Carried"],
        buried_part: d["Buried - Partly"],
        buried_full: d["Buried - Fully"],
        injured: d["Injured"],
        killed: d["Killed"],
      },
      summary_accident: d["Accident and Rescue Summary"],
      summary_terrain: d["Terrain Summary"],
      summary_weather: d["Weather Conditions and History"],
      comments: [
        d["Comments 1"],
        d["Comments 2"],
        d["Comments 3"],
        d["Comments 4"],
      ],
    };
  });

  //Filterin out invalid dates and avalanches prior to 2010
  data = data.filter((d) => d.date != null && d.date.getFullYear() >= 2010);

  return data;
}

/**
 * Preprocessed Data
 * @typedef {Object} AvalancheData
 * @property {number} aid
 * @property {Date} date
 * @property {string} region
 * @property {string} place
 * @property {string} trigger
 * @property {string} trigger_info
 * @property {string} layer
 * @property {number} depth
 * @property {number} width
 * @property {number} vertical
 * @property {[('N'|'E'|'S'|'W'),('N'|'E'|'S'|'W')]} aspect
 * @property {number} elevation
 * @property {[number, number]} coordinates
 * @property {('caught'|'carried'|'injured'|'killed'|'buried_part'|'buried_full')} victim_status
 * @property {string} summary_accident
 * @property {string} summary_terrain
 * @property {string} summary_weather
 * @property {Array<string>} comments
 */

/**
 * Raw Data
 * @typedef {Object} AvalancheDataRaw
 * @property {string} Date
 * @property {string} Region
 * @property {string} Place
 * @property {string} Trigger
 * @property {string} `Trigger: additional info`
 * @property {string} `Weak Layer`
 * @property {string} Depth
 * @property {string} Width
 * @property {string} Vertical
 * @property {string} Aspect
 * @property {string} Elevation
 * @property {string} Coordinates
 * @property {string} Caught
 * @property {string} Carried
 * @property {string} `Buried - Partly`
 * @property {string} `Buried - Fully`
 * @property {string} Injured
 * @property {string} Killed
 * @property {string} `Accident and Rescue Summary`
 * @property {string} `Terrain Summary`
 * @property {string} `Weather Conditions and History`
 * @property {string} `Comments 1`
 * @property {string} `Comments 2`
 * @property {string} `Comments 3`
 * @property {string} `Comments 4`
 */
