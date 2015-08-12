/*
 * SpeakIt anonymous usage reporting
 *
 * This file invokes data tracking scripts if enabled from options menu
 *
 * @package		SpeakIt
 * @category	Usage reports
 * @author		Trajche Petrov a.k.a SkechBoy
 * @link		https://github.com/skechboy/SpeakIt
*/
	track_scripts = [
						"fsa" // send analytics stats 
					];

	// get userdefined options
	options = JSON.parse(localStorage.getItem("options"));

	if(options != null && options.collect !== undefined && options.collect == true) // check if user gived permision to send anonymous usage data
	{
		for(script in track_scripts) // load all tracking scripts
		{
			track_file = track_scripts[script];

			track_js = document.createElement("script");
			track_js.type = "text/javascript";
			track_js.src = 'js/'+track_file+'.js';

			document.body.appendChild(track_js);
		}
	}
