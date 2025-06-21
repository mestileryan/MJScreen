namespace MJScreen.Api.Models;

public class Playlist
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public int? Width { get; set; }
    public ICollection<Track> Tracks { get; set; } = new List<Track>();
}
