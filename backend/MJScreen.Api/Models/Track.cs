namespace MJScreen.Api.Models;

public class Track
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public double InitialVolume { get; set; }
    public string? IconName { get; set; }
    public string? IconColor { get; set; }
    public int Order { get; set; }
    public bool Loop { get; set; }
    public int PlaylistId { get; set; }
    public Playlist? Playlist { get; set; }
    public string ContentType { get; set; } = string.Empty;
    public byte[] Data { get; set; } = Array.Empty<byte>();
}
