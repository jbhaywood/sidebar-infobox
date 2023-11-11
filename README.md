# Sidebar Infobox
This plugin was created for use with my TTRPG campaign vault. It displays an "infobox" in the right sidebar panel. Many GMs include this box directly inside the note, but by moving it into the sidebar it makes more room available.

Once enabled, you'll be able to view an image along with a table of all of the properties set in the frontmatter of the active note.

## Usage
Enable the plugin, expand the right sidebar and select the Sidebar Infobox tab (indicated by an icon with three horizontal lines).

Whenever a note with properties assigned to it is activated, the panel will populate.

## Settings
### Maximum Image Height
Value in pixels. Set to zero for no maximum. Useful for constraining tall images so that they don't take up the whole panel.

### Image Property
The name of the frontmatter property to use for the main image shown above the properties table. It should be the name of the image file located somewhere in the vault. Example file names suppoerted: myImage.jpg, [[myImage.jpg]], ![[myImage.jpg]], "![[myImage.jpg]]". Any valid image type should work.

### Images Property
The name of the frontmatter property to use for additional images. This is an array property, with each value being the name of the image file located somewhere in the vault. If you have more than one image you want to display, put them here. It can be used with or without the Image Property above.

If there is more than one image, two buttons with appear when you mouse over the image in the panel and can be used to cycle through them.

### Excluded Properties
The names of the frontmatter properties to exclude from the table. List them all on one line, with each followed by a comma. Useful for "cssclasses" and other properties you don't need to see in the infobox.

### Sort Properties
Whether or not to sort the properties alphabetically in the table.

### Capitalize Property Names
Whether or not to capitalize the property names.