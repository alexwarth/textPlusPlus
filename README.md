"Text++" Interfaces (or: Editable Views of Textual Inputs)
==========================================================

[Bret Victor's Scrubbing Calculator](http://worrydream.com/ScrubbingCalculator/) lets you type mathematical expressions, and as you type, some of your text gets "super powers": it automagically turns into user interface components. E.g., you can scrub numbers to change their values, but they're still text and can be edited as such. It feels pretty fluid and magical. I spent some time thinking about how to make this kind of thing easier to implement.

I also got interested in the idea of creating editable views of textual inputs. I'm not a big fan of the two-pane user interfaces that are popular these days where you type some text on the left, and see the rendered output on the right. (These are a huge step backwards considering [WYSIWYG](https://en.wikipedia.org/wiki/WYSIWYG) has been around since the 70s!)

This is a little experiment I did along these lines. The idea is that the input is really just text, but as you type it gets rendered to make it look like the thing you're trying to create. You still see all of the characters that you typed, so you can edito or delete them if you want, but they're de-emphasized so that they don't obscure the view.

A few things that are worth pointing out:

* I only render the input when it can be parsed -- when it's not valid, all I'm doing is inserting the new text into the structure that was produced from rendering the last good input, and making the new stuff red to show that something's not right.

* It's easy to add superpowers to the rendered, like in Bret's scrubbing calculator. Notice the numbers "glow" when you mouse over them, and they're also scrubbable.

* Some of the characters are only displayed when the "text++" widget has focus. E.g., near the end of the video, when I click outside of the widget, the "^" and "()"s disappear b/c they're not really necessary for viewing. They're only useful for editing, so you should only see them while editing. (I got this idea from Glen Chiacchieri's [Legible Mathematics](http://glench.com/LegibleMathematics/).)

* The library that I wrote to make this kind of interface (see the code in this repo) is pretty straightforward to use. The basic idea is that you get to wrap parts of the text in DOM nodes (which are styled using CSS) in a bottom-up way, while you're parsing it. The case where the input doesn't parse is handled automatically.

Of course this is just a little prototype, and there are lots of open questions, things you'd have to do to make it more usable, etc. But it's a start, and I haven't seen a lot of work in this area yet. It would be great if eventually, people could create text++ interfaces that are as slick as the expression editor in the [Demos calculator](https://www.desmos.com/calculator), without doing so much work. That's a good motivating example, I think.

Another application of this idea that I'd like to experiment with at some point is a hybrid of text-based and tile-based programming interfaces. Then you'd get the nice UI features from tile-based interfaces (like drop zones) without the associated "structural inertia" and lack of fluidity -- because you'd be able to enter or edit everything as though it were text, breaking tile boundaries, etc., whenever it made sense to do so.

-- Alex Warth, sometime in Q1 of 2014

Notes
-----

In this prototype, the programmer:

  * gives the framework a DOM tree
    * nodes w/ a "source" property are atomic w.r.t. to editing,
      the framework never looks inside them.
      * backspace deletes whole thing, all at once
      * this is useful for doing decoration stuff (source = '')
      * also useful for representing keywords as graphics (ST-like up-arrow image would have source = 'return')
    * text nodes are fine, and allow cursor and editing operations inside

while the framework:

  * converts programmer-provided DOM to a string
  * keeps track of cursor position
  * displays cursor
  * processes user events (keyboard and pointer events)
    * mutates user-provided DOM when key press events happen
      (but also asks programmer for a new DOM using updated string)
